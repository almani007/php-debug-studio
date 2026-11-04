import { TestResult } from './junit';
export interface CollectionRequest {
    name: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    assertions?: {
        statusCode?: number;
        jsonPath?: string;
        expectedValue?: any;
        maxDurationMs?: number;
    };
}
export interface Collection {
    name: string;
    requests: CollectionRequest[];
}
export declare function interpolate(template: string, env: Record<string, string>): string;
export declare function runCollection(collection: Collection, env: Record<string, string>): Promise<TestResult[]>;
//# sourceMappingURL=runner.d.ts.map