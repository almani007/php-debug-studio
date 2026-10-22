package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net"
	"strconv"
)

type DBGpBridge struct {
	listenAddr string
	mapper     *PathMapper
}

func NewDBGpBridge(listenAddr string, mapper *PathMapper) *DBGpBridge {
	return &DBGpBridge{
		listenAddr: listenAddr,
		mapper:     mapper,
	}
}

func (b *DBGpBridge) Start() error {
	ln, err := net.Listen("tcp", b.listenAddr)
	if err != nil {
		return err
	}
	defer ln.Close()

	log.Printf("[DBGp Bridge] Listening for Xdebug connections on %s", b.listenAddr)

	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("[DBGp Bridge] Accept error: %v", err)
			continue
		}

		go b.handleConnection(conn)
	}
}

func (b *DBGpBridge) handleConnection(conn net.Conn) {
	defer conn.Close()
	remoteAddr := conn.RemoteAddr().String()
	log.Printf("[DBGp Bridge] Connected from Xdebug engine: %s", remoteAddr)

	reader := bufio.NewReader(conn)
	txID := 0

	for {
		// Read length up to NUL
		lengthStr, err := reader.ReadString(0)
		if err != nil {
			break
		}
		lengthStr = lengthStr[:len(lengthStr)-1]
		length, err := strconv.Atoi(lengthStr)
		if err != nil {
			break
		}

		payload := make([]byte, length)
		if _, err := io.ReadFull(reader, payload); err != nil {
			break
		}
		// Read trailing NUL
		_, _ = reader.ReadByte()

		xmlText := string(payload)
		log.Printf("[DBGp <- Engine] %s", xmlText)

		// If init packet, negotiate features and run
		if len(xmlText) > 5 && xmlText[:5] == "<?xml" && (stringContains(xmlText, "<init")) {
			txID++
			runCmd := fmt.Sprintf("run -i %d\x00", txID)
			log.Printf("[DBGp -> Engine] %s", runCmd)
			_, _ = conn.Write([]byte(runCmd))
		}
	}

	log.Printf("[DBGp Bridge] Xdebug session closed: %s", remoteAddr)
}

func stringContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || (len(s) > 0 && len(substr) > 0 && (s[:len(substr)] == substr || (len(s) > len(substr) && containsHelper(s, substr)))))
}

func containsHelper(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
