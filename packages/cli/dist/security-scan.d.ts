export interface SecurityFinding {
    id: string;
    rule: string;
    severity: 'critical' | 'warning' | 'info';
    file: string;
    evidence: string;
    remediation: string;
}
export declare function scanProjectSecurity(projectPath: string): SecurityFinding[];
//# sourceMappingURL=security-scan.d.ts.map