import path from 'path';
import {buildConfig, Config, currentVariables, ENV_FILE, readEnvFile, SETTINGS, writeEnvFile} from './config';
import {SettingsData, SettingsSaveResult} from './models';

export class SettingsError extends Error {}

export interface SettingsApi {
    get(): SettingsData;
    save(values: Record<string, unknown>): SettingsSaveResult;
}

// Reads and writes backend/.env from the interface; onChange receives the reloaded configuration.
export function createSettingsApi(currentPort: () => number, onChange: (config: Config) => void): SettingsApi {
    const examples = readEnvFile(path.join(path.dirname(ENV_FILE), '.env.example'));

    return {
        get() {
            const vars = currentVariables();
            return {
                settings: SETTINGS.map(s => ({
                    ...s,
                    value: s.secret ? '' : vars[s.name] ?? '',
                    isSet: !!vars[s.name],
                    example: s.secret ? '' : examples[s.name] ?? '',
                })),
            };
        },

        save(values) {
            const updates: Record<string, string> = {};
            for (const [name, value] of Object.entries(values)) {
                if (!SETTINGS.some(s => s.name === name)) throw new SettingsError(`Variable inconnue : ${name}`);
                if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new SettingsError(`Valeur invalide pour ${name}`);
                updates[name] = value.trim();
            }
            let config: Config;
            try {
                config = buildConfig(currentVariables(updates));
            } catch (e) {
                throw new SettingsError(e instanceof Error ? e.message : String(e));
            }
            const portChanged = config.port !== currentPort();
            writeEnvFile(updates);
            onChange(config);
            return {portChanged};
        },
    };
}
