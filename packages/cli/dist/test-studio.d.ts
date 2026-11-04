export interface TestSuiteOptions {
    projectPath: string;
    runner?: 'phpunit' | 'pest';
    filter?: string;
    phpBinary?: string;
}
export interface TestExecutionResult {
    runner: string;
    exitCode: number;
    output: string;
    passed: boolean;
    durationMs: number;
}
export declare function runTests(options: TestSuiteOptions): Promise<TestExecutionResult>;
//# sourceMappingURL=test-studio.d.ts.map