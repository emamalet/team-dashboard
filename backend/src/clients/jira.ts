import {Config} from '../config';

export interface JiraUserRef {
    accountId: string;
    displayName: string;
    avatarUrls?: Record<string, string>;
}

export interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        created: string;
        updated: string;
        reporter?: JiraUserRef;
        comment?: { comments: { created: string; author: JiraUserRef }[] };
        status: { name: string; statusCategory?: { id: number } };
        assignee?: JiraUserRef;
        fixVersions: { name: string }[];
        issuetype?: { name: string };
        priority?: { name: string };
    };
    changelog?: {
        histories: {
            created: string;
            author?: JiraUserRef;
            items: { field: string; from?: string; to?: string; fromString?: string; toString?: string }[];
        }[];
    };
}

interface SearchOptions {
    expand?: string;
    limit?: number;
}

interface SearchResponse {
    issues: JiraIssue[];
    nextPageToken?: string;
}

export interface JiraClient {
    searchAll(jql: string, fields: string[], options?: SearchOptions): Promise<JiraIssue[]>;
}

export function createJiraClient(config: Config): JiraClient {
    const auth = Buffer.from(`${config.jiraEmail}:${config.jiraToken}`).toString('base64');

    async function post<T>(path: string, body: unknown): Promise<T> {
        const r = await fetch(`${config.jiraUrl}/rest/api/3${path}`, {
            method: 'POST',
            headers: {Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json'},
            body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`Jira ${r.status} sur ${path}`);
        return r.json() as Promise<T>;
    }

    // Fetches every page of a JQL search (token-based pagination).
    async function searchAll(jql: string, fields: string[], {expand, limit = 1000}: SearchOptions = {}): Promise<JiraIssue[]> {
        const issues: JiraIssue[] = [];
        let nextPageToken: string | undefined;
        do {
            const r: SearchResponse = await post('/search/jql', {jql, maxResults: 100, nextPageToken, fields, expand});
            issues.push(...r.issues);
            nextPageToken = r.nextPageToken;
        } while (nextPageToken && issues.length < limit);
        return issues;
    }

    return {searchAll};
}
