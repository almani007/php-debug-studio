export interface EnvironmentVariable {
    key: string;
    value: string;
    isSecret?: boolean;
    enabled?: boolean;
}
export interface EnvironmentProfile {
    name: string;
    variables: Record<string, string | EnvironmentVariable>;
}
export declare class EnvironmentManager {
    private activeVariables;
    constructor(envProfile?: EnvironmentProfile);
    loadProfile(profile: EnvironmentProfile): void;
    resolve(key: string): string | undefined;
    getExportableMap(includeSecrets?: boolean): Record<string, string>;
}
//# sourceMappingURL=environment.d.ts.map