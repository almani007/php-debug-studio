package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"brixel/php-debug-studio/daemon/pkg/api"
	"brixel/php-debug-studio/daemon/pkg/dbgp"
	"brixel/php-debug-studio/daemon/pkg/dbwatch"
	"brixel/php-debug-studio/daemon/pkg/executor"
	"brixel/php-debug-studio/daemon/pkg/mock"
	"brixel/php-debug-studio/daemon/pkg/store"
	"brixel/php-debug-studio/daemon/pkg/ws"
)

func main() {
	log.Println("Starting PHP Debug Studio Daemon v1.0.0 (by brixel)...")

	dbPath := os.Getenv("DEBUG_STUDIO_DB_PATH")
	if dbPath == "" {
		dbPath = "debug_studio.sqlite"
	}

	st, err := store.NewStore(dbPath)
	if err != nil {
		log.Fatalf("Fatal: could not initialize SQLite store: %v", err)
	}
	defer st.Close()

	hub := ws.NewHub()
	go hub.Run()

	// Live application SQL capture. The watcher finds the project's MySQL
	// container, enables its general query log and streams every statement
	// over the WebSocket as a "sql_query" event.
	sqlWatcher := dbwatch.New(dbwatch.Options{
		OnQuery: func(q dbwatch.Query) {
			hub.Broadcast("sql_query", q.ProjectID, q)
		},
		OnLog: log.Printf,
	})
	if projects, err := st.ListProjects(); err == nil && len(projects) > 0 {
		p := projects[0]
		sqlWatcher.SetProject(p.ID, p.Name, p.RootPath)
		go func() {
			time.Sleep(2 * time.Second)
			if err := sqlWatcher.Start(); err != nil {
				log.Printf("Live SQL capture unavailable: %v", err)
			}
		}()
		defer sqlWatcher.Stop()
	}

	execEngine := executor.NewEngine()

	// Initialize DBGp Xdebug bridge
	dbgpHost := os.Getenv("DEBUG_STUDIO_DBGP_HOST")
	if dbgpHost == "" {
		dbgpHost = "0.0.0.0"
	}
	dbgpPort := os.Getenv("DEBUG_STUDIO_DBGP_PORT")
	if dbgpPort == "" {
		dbgpPort = "9003"
	}
	dbgpAddr := fmt.Sprintf("%s:%s", dbgpHost, dbgpPort)
	dbgpListener := dbgp.NewListener(dbgpAddr, func(session *dbgp.DebugSession, event string) {
		hub.Broadcast("dbgp_session_event", session.ProjectID, map[string]interface{}{
			"session_id": session.ID,
			"event":      event,
			"state":      session.State,
		})
	})

	// Inject stored breakpoints into Xdebug when a session connects.
	// The resolver matches the session's file URI against saved breakpoints.
	dbgpListener.SetBreakpointResolver(func(fileURI string) []dbgp.BreakpointInfo {
		var result []dbgp.BreakpointInfo
		projects, err := st.ListProjects()
		if err != nil {
			return result
		}
		for _, p := range projects {
			bps, err := st.ListBreakpoints(p.ID)
			if err != nil {
				continue
			}
			for _, bp := range bps {
				if !bp.Enabled {
					continue
				}
				// Match exact file URI, or a prefix match (e.g. session at
				// file:///var/www/html/index.php matches breakpoint on that file).
				if bp.FileURI == fileURI ||
					strings.HasPrefix(fileURI, bp.FileURI) ||
					strings.HasPrefix(bp.FileURI, fileURI) {
					result = append(result, dbgp.BreakpointInfo{
						ID:         bp.ID,
						FileURI:    bp.FileURI,
						LineNumber: bp.LineNumber,
						Type:       bp.Type,
					})
				}
			}
		}
		return result
	})

	// Initialize TraceManager for auto-step line tracing
	traceManager := dbgp.NewTraceManager(func(recording *dbgp.TraceRecording, step *dbgp.TraceStep) {
		// Broadcast each trace step in real-time via WebSocket
		hub.Broadcast("trace_step", recording.ProjectID, map[string]interface{}{
			"trace_id":   recording.ID,
			"session_id": recording.SessionID,
			"step":       step,
			"step_count": len(recording.Steps),
			"status":     recording.Status,
		})
	})
	dbgpListener.SetTraceManager(traceManager)

	if err := dbgpListener.Start(); err != nil {
		log.Printf("Warning: DBGp listener failed to start on %s: %v", dbgpAddr, err)
	} else {
		log.Printf("DBGp Xdebug listener active on %s", dbgpAddr)
		log.Printf("Line Trace mode available - auto-step through code without breakpoints")
		defer dbgpListener.Close()
	}

	mockEngine := mock.NewMockServer()
	server := api.NewServer(st, hub, execEngine, dbgpListener, mockEngine)
	server.SetDBWatcher(sqlWatcher)

	port := os.Getenv("DEBUG_STUDIO_PORT")
	if port == "" {
		port = "8765"
	}
	host := os.Getenv("DEBUG_STUDIO_HOST")
	if host == "" {
		host = "0.0.0.0"
	}
	bindAddr := fmt.Sprintf("%s:%s", host, port)

	httpServer := &http.Server{
		Addr:    bindAddr,
		Handler: server,
	}

	go func() {
		log.Printf("PHP Debug Studio API listening at http://%s", bindAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)
	<-stopChan

	log.Println("Shutting down daemon...")
	_ = httpServer.Close()
}
