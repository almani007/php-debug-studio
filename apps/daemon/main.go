package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"zoventra/php-debug-studio/daemon/pkg/api"
	"zoventra/php-debug-studio/daemon/pkg/dbgp"
	"zoventra/php-debug-studio/daemon/pkg/executor"
	"zoventra/php-debug-studio/daemon/pkg/mock"
	"zoventra/php-debug-studio/daemon/pkg/store"
	"zoventra/php-debug-studio/daemon/pkg/ws"
)

func main() {
	log.Println("Starting PHP Debug Studio Daemon v1.0.0 (by zoventra)...")

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

	execEngine := executor.NewEngine()

	// Initialize DBGp Xdebug bridge
	dbgpListener := dbgp.NewListener("127.0.0.1:9003", func(session *dbgp.DebugSession, event string) {
		hub.Broadcast("dbgp_session_event", session.ProjectID, map[string]interface{}{
			"session_id": session.ID,
			"event":      event,
			"state":      session.State,
		})
	})

	if err := dbgpListener.Start(); err != nil {
		log.Printf("Warning: DBGp listener failed to start: %v", err)
	} else {
		log.Printf("DBGp Xdebug listener active on 127.0.0.1:9003")
		defer dbgpListener.Close()
	}

	mockEngine := mock.NewMockServer()
	server := api.NewServer(st, hub, execEngine, dbgpListener, mockEngine)

	port := os.Getenv("DEBUG_STUDIO_PORT")
	if port == "" {
		port = "8765"
	}
	bindAddr := fmt.Sprintf("127.0.0.1:%s", port)

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
