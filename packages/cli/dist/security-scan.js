"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanProjectSecurity = scanProjectSecurity;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function scanProjectSecurity(projectPath) {
    const findings = [];
    const resolved = path_1.default.resolve(projectPath);
    // 1. Check for exposed .env or APP_DEBUG=true
    const envPath = path_1.default.join(resolved, '.env');
    if (fs_1.default.existsSync(envPath)) {
        const content = fs_1.default.readFileSync(envPath, 'utf8');
        if (/APP_DEBUG\s*=\s*true/i.test(content) && /APP_ENV\s*=\s*prod/i.test(content)) {
            findings.push({
                id: 'SEC-001',
                rule: 'Production Debug Flag Enabled',
                severity: 'critical',
                file: '.env',
                evidence: 'APP_DEBUG=true with APP_ENV=production',
                remediation: 'Disable APP_DEBUG=false in production to prevent leaking sensitive stack traces and credentials.',
            });
        }
        if (/APP_KEY\s*=\s*$/m.test(content)) {
            findings.push({
                id: 'SEC-002',
                rule: 'Missing Application Key',
                severity: 'critical',
                file: '.env',
                evidence: 'APP_KEY is empty',
                remediation: 'Generate an application key using "php artisan key:generate".',
            });
        }
    }
    // 2. Check for public exposure of sensitive files (.git, composer.lock, storage)
    const sensitiveFiles = ['.git/config', 'storage/logs/laravel.log'];
    for (const rel of sensitiveFiles) {
        const full = path_1.default.join(resolved, rel);
        if (fs_1.default.existsSync(full)) {
            findings.push({
                id: 'SEC-003',
                rule: 'Sensitive Local Repository File Present',
                severity: 'info',
                file: rel,
                evidence: `File exists at ${rel}`,
                remediation: 'Ensure web server block rules (Nginx/Apache) prevent public access to this path.',
            });
        }
    }
    return findings;
}
//# sourceMappingURL=security-scan.js.map