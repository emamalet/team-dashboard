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
        'TEAM_DEVS', 'TEAM_TESTERS', 'WORK_DAYS_PER_WEEK', 'UNESTIMATED_MIN_DAYS', 'UNESTIMATED_MAX_DAYS',
        'UNESTIMATED_TEST_MIN_DAYS', 'UNESTIMATED_TEST_MAX_DAYS', 'DEV_DONE_STATUSES', 'EXCLUDED_ISSUE_TYPES'],
};

export class NotConfiguredError extends Error {
    constructor(readonly missing: string[]) {
        super(`Configuration incomplete : renseignez ${missing.join(', ')} via l'icone engrenage (menu Configuration) ou dans le fichier backend/.env`);
    }
}

// Variables editable from the interface (Configuration page), in display order. Keep in sync with REQUIRED and .env.example.
export interface Setting {
    name: string;
    group: string;
    help: string;
    secret?: boolean;
}

export const SETTINGS: Setting[] = [
    {name: 'PORT', group: 'Serveur', help: "Port d'ecoute du dashboard (redemarrage necessaire apres modification)"},
    {name: 'COMMITS_PER_DEV', group: 'Serveur', help: 'Nombre de derniers commits affiches par developpeur'},
    {name: 'GITLAB_URL', group: 'GitLab', help: 'URL de GitLab, sans /api'},
    {name: 'GITLAB_TOKEN', group: 'GitLab', secret: true, help: 'Token GitLab avec le scope read_api'},
    {name: 'GITLAB_PROJECT_ID', group: 'GitLab', help: 'Id numerique du projet'},
    {name: 'GITLAB_PROJECT_PATH', group: 'GitLab', help: "Chemin du projet dans l'URL GitLab (liens des commits)"},
    {name: 'GITLAB_DEPLOY_PROJECT_ID', group: 'Pipelines', help: 'Id du projet dont les pipelines representent les deploiements'},
    {name: 'DEPLOY_ENV_VARIABLES', group: 'Pipelines', help: "Variables de pipeline donnant l'environnement cible (separees par des virgules)"},
    {name: 'DEPLOY_VERSION_VARIABLES', group: 'Pipelines', help: 'Variables de pipeline donnant la version deployee (la premiere renseignee gagne)'},
    {name: 'DEPLOY_ENVIRONMENTS', group: 'Pipelines', help: 'Libelle affiche -> valeur de la variable, au format JSON'},
    {name: 'JIRA_URL', group: 'Jira', help: 'URL Jira Cloud'},
    {name: 'JIRA_EMAIL', group: 'Jira', help: 'Email du compte Jira'},
    {name: 'JIRA_TOKEN', group: 'Jira', secret: true, help: "Token d'API Atlassian"},
    {name: 'JIRA_PROJECT', group: 'Jira', help: 'Cle du projet Jira'},
    {name: 'JIRA_STATUS_ORDER', group: 'Jira', help: "Ordre d'affichage des statuts (separes par des virgules)"},
    {name: 'JIRA_DEV_ESTIMATE_FIELD', group: 'Versions', help: "Ids du champ Jira d'estimation dev (separes par des virgules, le premier renseigne gagne)"},
    {name: 'JIRA_TEST_ESTIMATE_FIELD', group: 'Versions', help: "Ids du champ Jira d'estimation test (separes par des virgules, le premier renseigne gagne)"},
    {name: 'JIRA_DEV_ESTIMATE_DIVISOR', group: 'Versions', help: "Diviseur convertissant l'estimation dev en jours"},
    {name: 'JIRA_TEST_ESTIMATE_DIVISOR', group: 'Versions', help: "Diviseur convertissant l'estimation test en jours"},
    {name: 'TEAM_DEVS', group: 'Versions', help: 'Nombre de developpeurs (ETP)'},
    {name: 'TEAM_TESTERS', group: 'Versions', help: 'Nombre de testeurs (ETP)'},
    {name: 'WORK_DAYS_PER_WEEK', group: 'Versions', help: 'Jours travailles par semaine (lundi en premier)'},
    {name: 'UNESTIMATED_MIN_DAYS', group: 'Versions', help: 'Jours minimum pour un ticket non estime cote dev'},
    {name: 'UNESTIMATED_MAX_DAYS', group: 'Versions', help: 'Jours maximum pour un ticket non estime cote dev'},
    {name: 'UNESTIMATED_TEST_MIN_DAYS', group: 'Versions', help: 'Jours minimum pour un ticket non estime cote test'},
    {name: 'UNESTIMATED_TEST_MAX_DAYS', group: 'Versions', help: 'Jours maximum pour un ticket non estime cote test'},
    {name: 'DEV_DONE_STATUSES', group: 'Versions', help: "Statuts ou le dev est termine : l'estimation dev n'est plus comptee (separes par des virgules)"},
    {name: 'EXCLUDED_ISSUE_TYPES', group: 'Versions', help: "Types de ticket exclus du calcul (epics, taches, sous-taches), separes par des virgules"},
];

export const ENV_FILE = path.join(__dirname, '..', '.env');
const PROCESS_ENV: Record<string, string | undefined> = {...process.env};

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
    jiraDevEstimateField: string[];
    jiraTestEstimateField: string[];
    jiraDevEstimateDivisor: number;
    jiraTestEstimateDivisor: number;
    teamDevs: number;
    teamTesters: number;
    workDaysPerWeek: number;
    unestimatedMinDays: number;
    unestimatedMaxDays: number;
    unestimatedTestMinDays: number;
    unestimatedTestMaxDays: number;
    devDoneStatuses: string[];
    excludedIssueTypes: string[];
}

// Parses a .env file (KEY=VALUE); a missing file gives no variables.
export function readEnvFile(file = ENV_FILE): Record<string, string> {
    const vars: Record<string, string> = {};
    if (!fs.existsSync(file)) return vars;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([\w.]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    return vars;
}

// Updates (or appends) KEY=VALUE lines of the .env file, keeping comments and other lines untouched.
export function writeEnvFile(updates: Record<string, string>): void {
    const text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text === '' ? [] : text.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    for (const [name, value] of Object.entries(updates)) {
        const i = lines.findIndex(l => new RegExp(`^\\s*${name}\\s*=`).test(l));
        if (i >= 0) lines[i] = `${name}=${value}`;
        else lines.push(`${name}=${value}`);
    }
    fs.writeFileSync(ENV_FILE, lines.join(eol) + eol, 'utf8');
}

// Variables as the server sees them: process environment first, then the .env file.
export const currentVariables = (overrides: Record<string, string> = {}): Record<string, string | undefined> =>
    ({...readEnvFile(), ...overrides, ...PROCESS_ENV});

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

export const loadConfig = (): Config => buildConfig(currentVariables());

export function buildConfig(vars: Record<string, string | undefined>): Config {
    const env = (name: string): string => vars[name] ?? '';
    if (!env('PORT')) throw new Error("Variable PORT manquante : renseignez-la dans backend/.env (voir .env.example)");

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
    const unestimatedTestMinDays = positive('UNESTIMATED_TEST_MIN_DAYS');
    const unestimatedTestMaxDays = positive('UNESTIMATED_TEST_MAX_DAYS');
    if (unestimatedTestMaxDays < unestimatedTestMinDays) throw new Error('UNESTIMATED_TEST_MAX_DAYS doit etre >= UNESTIMATED_TEST_MIN_DAYS');

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
        jiraDevEstimateField: list(env('JIRA_DEV_ESTIMATE_FIELD')),
        jiraTestEstimateField: list(env('JIRA_TEST_ESTIMATE_FIELD')),
        jiraDevEstimateDivisor: positive('JIRA_DEV_ESTIMATE_DIVISOR'),
        jiraTestEstimateDivisor: positive('JIRA_TEST_ESTIMATE_DIVISOR'),
        teamDevs: positive('TEAM_DEVS'),
        teamTesters: positive('TEAM_TESTERS'),
        workDaysPerWeek: integer('WORK_DAYS_PER_WEEK', 1, 7),
        unestimatedMinDays,
        unestimatedMaxDays,
        unestimatedTestMinDays,
        unestimatedTestMaxDays,
        devDoneStatuses: list(env('DEV_DONE_STATUSES')),
        excludedIssueTypes: list(env('EXCLUDED_ISSUE_TYPES')),
    };
}
