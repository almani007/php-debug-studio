package main

import (
	"flag"
	"log"
)

func main() {
	listenAddr := flag.String("listen", "127.0.0.1:9003", "DBGp TCP listener address")
	remotePrefix := flag.String("remote-prefix", "/var/www/html", "Docker/Remote source directory prefix")
	localPrefix := flag.String("local-prefix", ".", "Local host source directory prefix")
	flag.Parse()

	log.Println("Starting PHP Debug Studio Xdebug Bridge (by zoventra)...")
	mapper := NewPathMapper(*remotePrefix, *localPrefix)
	bridge := NewDBGpBridge(*listenAddr, mapper)

	if err := bridge.Start(); err != nil {
		log.Fatalf("Fatal error: %v", err)
	}
}
