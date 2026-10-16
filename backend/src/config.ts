import fs from 'fs';
import path from 'path';

export interface Config {
    port: number;
    commitsPerDev: number;
    gitlabUrl: string;
    gitlabToken: string;
    gitlabProjectId: string;
    gitlabProjectPath: string;
    deployProjectId: string;
    deployEnvVariables: string[];
    deployVersionVariables: string[];
    deployEnvironments: Record<string, string>;
    jiraUrl: string;
    jiraEmail: string;
    jiraToken: string;
    jiraProject: string;
    jiraStatusOrder: string[];
}

// Loads a .env file (KEY=VALUE) without overriding variables that are already set.
function loadDotEnv(file: string): void {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([\w.]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (!m) continue;
        process.env[m[1]] ??= m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
}

const list = (value: string): string[] => value.split(',').map(s => s.trim()).filter(Boolean);
const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

function parseEnvironments(raw: string): Record<string, string> {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch { /* error reported below */ }
    throw new Error('DEPLOY_ENVIRONMENTS doit etre un objet JSON {"libelle":"valeur"}');
}

export function loadConfig(): Config {
    loadDotEnv(path.join(__dirname, '..', '.env'));

    const missing: string[] = [];
    const need = (name: string): string => {
        const value = process.env[name];
        if (!value) missing.push(name);
        return value ?? '';
    };

    const raw = {
        port: need('PORT'),
        commitsPerDev: need('COMMITS_PER_DEV'),
        gitlabUrl: need('GITLAB_URL'),
        gitlabToken: need('GITLAB_TOKEN'),
        gitlabProjectId: need('GITLAB_PROJECT_ID'),
        gitlabProjectPath: need('GITLAB_PROJECT_PATH'),
        deployProjectId: need('GITLAB_DEPLOY_PROJECT_ID'),
        deployEnvVariables: need('DEPLOY_ENV_VARIABLES'),
        deployVersionVariables: need('DEPLOY_VERSION_VARIABLES'),
        deployEnvironments: need('DEPLOY_ENVIRONMENTS'),
        jiraUrl: need('JIRA_URL'),
        jiraEmail: need('JIRA_EMAIL'),
        jiraToken: need('JIRA_TOKEN'),
        jiraProject: need('JIRA_PROJECT'),
        jiraStatusOrder: need('JIRA_STATUS_ORDER'),
    };

    if (missing.length) {
        throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')} (voir .env.example)`);
    }
    const port = Number(raw.port), commitsPerDev = Number(raw.commitsPerDev);
    if (!Number.isInteger(port) || port < 1) throw new Error('PORT doit etre un entier >= 1');
    if (!Number.isInteger(commitsPerDev) || commitsPerDev < 1) throw new Error('COMMITS_PER_DEV doit etre un entier >= 1');

    return {
        ...raw,
        port,
        commitsPerDev,
        gitlabUrl: stripTrailingSlash(raw.gitlabUrl),
        jiraUrl: stripTrailingSlash(raw.jiraUrl),
        deployEnvVariables: list(raw.deployEnvVariables),
        deployVersionVariables: list(raw.deployVersionVariables),
        deployEnvironments: parseEnvironments(raw.deployEnvironments),
        jiraStatusOrder: list(raw.jiraStatusOrder),
    };
}
