export interface TestResult {
    name: string;
    passed: boolean;
    durationMs: number;
    failureMessage?: string;
}
export declare function generateJUnitReport(suiteName: string, results: TestResult[]): string;
//# sourceMappingURL=junit.d.ts.map