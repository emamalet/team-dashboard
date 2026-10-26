import fs from 'fs';
import path from 'path';

// Each tab is enabled only when all of its variables are set.
export type Feature = 'git' | 'pipelines' | 'jira' | 'versions';

const GITLAB = ['GITLAB_URL', 'GITLAB_TOKEN'];
const JIRA = ['JIRA_URL', 'JIRA_EMAIL', 'JIRA_TOKEN', 'JIRA_PROJECT'];
const REQUIRED: Record<Feature, string[]> = {
    git: [...GITLAB, 'GITLAB_PROJECT_ID', 'GITLAB_PROJECT_PATH', 'COMMITS_PER_DEV'],
    pipelines: [...GITLAB, 'GITLAB_PROJECT_ID', 'GITLAB_DEPLOY_PROJECT_ID', 'DEPLOY_ENV_VARIABLES', 'DEPLOY_VERSION_VARIABLES', 'DEPLOY_ENVIRONMENTS'],
    jira: [...JIRA, 'JIRA_STATUS_ORDER'],
    versions: [...JIRA, 'JIRA_STATUS_ORDER', 'JIRA_DEV_ESTIMATE_FIELD', 'JIRA_TEST_ESTIMATE_FIELD', 'JIRA_DEV_ESTIMATE_DIVISOR', 'JIRA_TEST_ESTIMATE_DIVISOR',
        'TEAM_DEVS', 'TEAM_TESTERS', 'WORK_DAYS_PER_WEEK', 'UNESTIMATED_MIN_DAYS', 'UNESTIMATED_MAX_DAYS'],
};

export class NotConfiguredError extends Error {
    constructor(readonly missing: string[]) {
        super(`Veuillez renseigner les variables : ${missing.join(', ')} dans le fichier backend/.env`);
    }
}

export interface Config {
    port: number;
    // Missing variables per tab; values of the tabs listed here are unusable placeholders.
    missing: Record<Feature, string[]>;
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
    jiraDevEstimateField: string;
    jiraTestEstimateField: string;
    jiraDevEstimateDivisor: number;
    jiraTestEstimateDivisor: number;
    teamDevs: number;
    teamTesters: number;
    workDaysPerWeek: number;
    unestimatedMinDays: number;
    unestimatedMaxDays: number;
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
    if (!raw) return {};
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch { /* error reported below */ }
    throw new Error('DEPLOY_ENVIRONMENTS doit etre un objet JSON {"libelle":"valeur"}');
}

export function loadConfig(): Config {
    loadDotEnv(path.join(__dirname, '..', '.env'));

    const env = (name: string): string => process.env[name] ?? '';
    if (!env('PORT')) throw new Error("Variables d'environnement manquantes : PORT (voir .env.example)");

    // An unset optional variable gives 0; a set one must be valid even if its tab is otherwise disabled.
    const num = (name: string, valid: (n: number) => boolean, rule: string): number => {
        if (!env(name)) return 0;
        const n = Number(env(name));
        if (!valid(n)) throw new Error(`${name} doit etre ${rule}`);
        return n;
    };
    const integer = (name: string, min: number, max = Infinity) =>
        num(name, n => Number.isInteger(n) && n >= min && n <= max, max === Infinity ? `un entier >= ${min}` : `un entier entre ${min} et ${max}`);
    const positive = (name: string) => num(name, n => Number.isFinite(n) && n > 0, 'un nombre > 0');

    const missing = Object.fromEntries(
        Object.entries(REQUIRED).map(([feature, names]) => [feature, names.filter(n => !env(n))]),
    ) as Record<Feature, string[]>;

    const unestimatedMinDays = positive('UNESTIMATED_MIN_DAYS');
    const unestimatedMaxDays = positive('UNESTIMATED_MAX_DAYS');
    if (unestimatedMaxDays < unestimatedMinDays) throw new Error('UNESTIMATED_MAX_DAYS doit etre >= UNESTIMATED_MIN_DAYS');

    return {
        port: integer('PORT', 1),
        missing,
        commitsPerDev: integer('COMMITS_PER_DEV', 1),
        gitlabUrl: stripTrailingSlash(env('GITLAB_URL')),
        gitlabToken: env('GITLAB_TOKEN'),
        gitlabProjectId: env('GITLAB_PROJECT_ID'),
        gitlabProjectPath: env('GITLAB_PROJECT_PATH'),
        deployProjectId: env('GITLAB_DEPLOY_PROJECT_ID'),
        deployEnvVariables: list(env('DEPLOY_ENV_VARIABLES')),
        deployVersionVariables: list(env('DEPLOY_VERSION_VARIABLES')),
        deployEnvironments: parseEnvironments(env('DEPLOY_ENVIRONMENTS')),
        jiraUrl: stripTrailingSlash(env('JIRA_URL')),
        jiraEmail: env('JIRA_EMAIL'),
        jiraToken: env('JIRA_TOKEN'),
        jiraProject: env('JIRA_PROJECT'),
        jiraStatusOrder: list(env('JIRA_STATUS_ORDER')),
        jiraDevEstimateField: env('JIRA_DEV_ESTIMATE_FIELD'),
        jiraTestEstimateField: env('JIRA_TEST_ESTIMATE_FIELD'),
        jiraDevEstimateDivisor: positive('JIRA_DEV_ESTIMATE_DIVISOR'),
        jiraTestEstimateDivisor: positive('JIRA_TEST_ESTIMATE_DIVISOR'),
        teamDevs: positive('TEAM_DEVS'),
        teamTesters: positive('TEAM_TESTERS'),
        workDaysPerWeek: integer('WORK_DAYS_PER_WEEK', 1, 7),
        unestimatedMinDays,
        unestimatedMaxDays,
    };
}
