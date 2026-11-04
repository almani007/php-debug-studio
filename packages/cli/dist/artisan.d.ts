export declare const SAFE_COMMAND_ALLOWLIST: string[];
export declare const DESTRUCTIVE_COMMANDS: string[];
export interface ArtisanRunOptions {
    projectPath: string;
    command: string;
    args?: string[];
    forceDestructive?: boolean;
    phpBinary?: string;
}
export interface ArtisanResult {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    isDestructive: boolean;
    durationMs: number;
}
export declare function executeArtisan(options: ArtisanRunOptions): Promise<ArtisanResult>;
//# sourceMappingURL=artisan.d.ts.map