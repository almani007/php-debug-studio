export interface FailedJob {
    id: string;
    connection: string;
    queue: string;
    payload: string;
    exception: string;
    failed_at: string;
}
export declare function listFailedJobs(projectPath: string, phpBinary?: string): Promise<string>;
export declare function retryFailedJob(jobId: string, projectPath: string, phpBinary?: string): Promise<string>;
//# sourceMappingURL=queue-diagnostics.d.ts.map