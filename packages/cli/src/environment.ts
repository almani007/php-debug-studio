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

export class EnvironmentManager {
  private activeVariables: Map<string, EnvironmentVariable> = new Map();

  constructor(envProfile?: EnvironmentProfile) {
    if (envProfile) {
      this.loadProfile(envProfile);
    }
  }

  public loadProfile(profile: EnvironmentProfile): void {
    for (const [key, val] of Object.entries(profile.variables)) {
      if (typeof val === 'string') {
        this.activeVariables.set(key, { key, value: val, isSecret: false, enabled: true });
      } else {
        this.activeVariables.set(key, { ...val, enabled: val.enabled !== false });
      }
    }
  }

  public resolve(key: string): string | undefined {
    const item = this.activeVariables.get(key);
    if (item && item.enabled) {
      return item.value;
    }
    return process.env[key];
  }

  public getExportableMap(includeSecrets = false): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, item] of this.activeVariables.entries()) {
      if (item.enabled) {
        result[key] = item.isSecret && !includeSecrets ? '***REDACTED***' : item.value;
      }
    }
    return result;
  }
}
