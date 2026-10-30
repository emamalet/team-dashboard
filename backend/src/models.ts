// API contract: these types are duplicated in frontend/src/app/core/models.ts.

export interface MergeRequest {
    iid: number;
    title: string;
    url: string;
    draft: boolean;
    source: string;
    target: string;
    author?: string;
    avatar?: string;
    reviewers: string[];
    created: string;
    updated: string;
    conflicts: boolean;
    merge?: string;
    pipeline: string | null;
    comments: number;
}

export interface PushSummary {
    sha: string;
    title: string;
    ref: string;
    date: string;
    created: boolean;
    removed: boolean;
    count: number;
    url: string;
}

export interface Developer {
    name: string;
    username: string;
    avatar?: string;
    pushes: number;
    commits: number;
    branches: string[];
    days: number;
    last: PushSummary[];
    lastActivity?: string;
}

export interface GitData {
    mrs: MergeRequest[];
    devs: Developer[];
}

export type JiraEventType = 'created' | 'comment' | 'transition' | 'assigned' | 'reassigned' | 'update';

export interface JiraEvent {
    type: JiraEventType;
    key: string;
    summary: string;
    detail: string;
    date: string;
    url: string;
}

export interface JiraUser {
    name: string;
    avatar?: string;
    comments: number;
    transitions: number;
    assigned: number;
    created: number;
    otherChanges: number;
    events: JiraEvent[];
}

export interface VersionedIssue {
    key: string;
    summary: string;
    url: string;
    status: string;
    category: number;
    assignee?: string;
    avatar?: string;
    versions: string[];
    type?: string;
    priority?: string;
    updated: string;
}

export interface JiraData {
    versioned: VersionedIssue[];
    users: JiraUser[];
}

export interface Deployment {
    id: number;
    env: string;
    status: string;
    date: string;
    url: string;
    user?: string;
    avatar?: string;
    ref: string;
    version: string;
}

export interface EnvironmentStatus {
    label: string;
    env: string;
    latest: Deployment | null;
    lastSuccess: Deployment | null;
}

export interface PipelineFailure {
    id: number;
    ref: string;
    sha: string;
    date: string;
    source: string;
    url: string;
    user?: string;
    avatar?: string;
}

export interface PipelineData {
    environments: EnvironmentStatus[];
    history: Deployment[];
    failures: PipelineFailure[];
    branches: string[];
}

export interface Range<T> {
    optimistic: T;
    pessimistic: T;
}

export interface VersionIssue {
    key: string;
    summary: string;
    url: string;
    status: string;
    assignee?: string;
    avatar?: string;
    type?: string;
    devDays?: number;
    testDays?: number;
}

export interface VersionForecast {
    name: string;
    after?: string;
    releaseDate?: string;
    issues: VersionIssue[];
    devDays: Range<number>;
    testDays: Range<number>;
    devDuration: Range<number>;
    testDuration: Range<number>;
    delivery: Range<string>;
}

export interface VersionsData {
    team: { devs: number; testers: number; workDaysPerWeek: number; unestimatedMin: number; unestimatedMax: number; unestimatedTestMin: number; unestimatedTestMax: number };
    versions: VersionForecast[];
}

export interface SettingItem {
    name: string;
    group: string;
    help: string;
    secret?: boolean;
    // Never filled for secrets: only isSet tells whether one is configured.
    value: string;
    isSet: boolean;
    example: string;
}

export interface SettingsData {
    settings: SettingItem[];
}

export interface SettingsSaveResult {
    portChanged: boolean;
}
