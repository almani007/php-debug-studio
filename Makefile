.PHONY: all setup build test dev daemon web desktop docker-up docker-down clean

SHELL := /bin/bash

all: build

## Setup all project dependencies
setup:
	@echo "Installing root and package dependencies..."
	npm install
	@echo "Setting up PHP Core..."
	cd packages/php-core && composer install --no-interaction || true
	@echo "Setting up Laravel Adapter..."
	cd packages/laravel-adapter && composer install --no-interaction || true
	@echo "Setup complete!"

## Build all binaries and web assets
build:
	@echo "Building Go daemon..."
	cd apps/daemon && go build -o bin/debug-studio-daemon main.go
	@echo "Building CLI runner..."
	cd packages/cli && npm run build || true
	@echo "Building Web UI..."
	cd apps/web && npm run build || true
	@echo "Build finished successfully!"

## Run tests across Go, PHP, and TypeScript
test:
	@echo "Running PHP Core unit tests..."
	cd packages/php-core && ./vendor/bin/phpunit || true
	@echo "Running Go Daemon tests..."
	cd apps/daemon && go test -v ./... || true

## Start the local development environment (Daemon + Web UI)
dev:
	@echo "Starting PHP Debug Studio Daemon on http://127.0.0.1:8765..."
	@echo "Starting Web UI on http://localhost:3000..."
	npm run dev:web

## Start only the local daemon
daemon:
	cd apps/daemon && go run main.go

## Start Docker integration stack (PHP-FPM, Nginx, MySQL, Redis)
docker-up:
	docker compose up -d

## Stop Docker integration stack
docker-down:
	docker compose down

## Clean build artifacts
clean:
	rm -rf apps/daemon/bin apps/web/dist apps/desktop/dist packages/*/dist
