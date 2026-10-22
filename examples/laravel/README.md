# Laravel Example Integration

This directory demonstrates how **PHP Debug Studio** integrates with a Laravel 10 / 11 / 12 application.

## 1. Quick Setup

```bash
composer require --dev zoventra/php-debug-studio-laravel
php artisan debug-studio:install
```

## 2. Included Sample Files

- [`api.php`](api.php): Sample routes (`GET /up`, `GET /api/users`, `POST /api/users`).
- [`UserController.php`](UserController.php): Demonstrates automatic SQL query capture via `DB::listen` and trace-linked log dispatch.
- [`sample_collection.json`](sample_collection.json): Automated API Studio test collection with assertions.
- [`sample_env.json`](sample_env.json): Sample environment configuration for testing.

## 3. Running Automated Tests with CLI Runner

```bash
debug-studio run sample_collection.json --env sample_env.json --report-junit report.xml
```
