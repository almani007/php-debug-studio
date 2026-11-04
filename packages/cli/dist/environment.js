"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentManager = void 0;
class EnvironmentManager {
    activeVariables = new Map();
    constructor(envProfile) {
        if (envProfile) {
            this.loadProfile(envProfile);
        }
    }
    loadProfile(profile) {
        for (const [key, val] of Object.entries(profile.variables)) {
            if (typeof val === 'string') {
                this.activeVariables.set(key, { key, value: val, isSecret: false, enabled: true });
            }
            else {
                this.activeVariables.set(key, { ...val, enabled: val.enabled !== false });
            }
        }
    }
    resolve(key) {
        const item = this.activeVariables.get(key);
        if (item && item.enabled) {
            return item.value;
        }
        return process.env[key];
    }
    getExportableMap(includeSecrets = false) {
        const result = {};
        for (const [key, item] of this.activeVariables.entries()) {
            if (item.enabled) {
                result[key] = item.isSecret && !includeSecrets ? '***REDACTED***' : item.value;
            }
        }
        return result;
    }
}
exports.EnvironmentManager = EnvironmentManager;
//# sourceMappingURL=environment.js.map