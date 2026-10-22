import fs from 'fs';
import path from 'path';

export interface SecurityFinding {
  id: string;
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  file: string;
  evidence: string;
  remediation: string;
}

export function scanProjectSecurity(projectPath: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const resolved = path.resolve(projectPath);

  // 1. Check for exposed .env or APP_DEBUG=true
  const envPath = path.join(resolved, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');

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
    const full = path.join(resolved, rel);
    if (fs.existsSync(full)) {
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
