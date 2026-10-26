import {Config} from '../config';
import {JiraClient, JiraIssue, JiraUserRef} from '../clients/jira';
import {JiraData, JiraEventType, JiraUser, VersionedIssue} from '../models';
import {inRange, statusRank} from '../utils';

const MAX_EVENTS_PER_USER = 30;

type Counter = 'comments' | 'transitions' | 'assigned' | 'created' | 'otherChanges';
type RecordEvent = (user: JiraUserRef, counter: Counter, type: JiraEventType, issue: JiraIssue, detail: string, date: string) => void;
type ChangelogItem = NonNullable<JiraIssue['changelog']>['histories'][number]['items'][number];
type History = NonNullable<JiraIssue['changelog']>['histories'][number];

export function createJiraService({config, jira}: { config: Config; jira: JiraClient }) {
    const browseUrl = (key: string) => `${config.jiraUrl}/browse/${key}`;

    function createActivityTracker() {
        const users = new Map<string, JiraUser>();
        const userOf = (u: JiraUserRef): JiraUser => {
            if (!users.has(u.accountId)) {
                users.set(u.accountId, {
                    name: u.displayName, avatar: u.avatarUrls?.['48x48'],
                    comments: 0, transitions: 0, assigned: 0, created: 0, otherChanges: 0, events: [],
                });
            }
            return users.get(u.accountId)!;
        };
        const RecordEvent: RecordEvent = (user, counter, type, issue, detail, date) => {
            const u = userOf(user);
            u[counter]++;
            u.events.push({type, key: issue.key, summary: issue.fields.summary, detail, date, url: browseUrl(issue.key)});
        };
        return {users, RecordEvent};
    }

    function recordChangelogItem(RecordEvent: RecordEvent, history: History, item: ChangelogItem, issue: JiraIssue): void {
        const author = history.author!;
        if (item.field === 'status') {
            RecordEvent(author, 'transitions', 'transition', issue, `${item.fromString} -> ${item.toString}`, history.created);
        } else if (item.field === 'assignee' && item.to === author.accountId) {
            RecordEvent(author, 'assigned', 'assigned', issue, "S'est assigne", history.created);
        } else if (item.field === 'assignee') {
            RecordEvent(author, 'otherChanges', 'reassigned', issue, `Assigne a ${item.toString || 'personne'}`, history.created);
        } else {
            RecordEvent(author, 'otherChanges', 'update', issue, `${item.field} modifie`, history.created);
        }
    }

    function collectIssueActivity(RecordEvent: RecordEvent, issue: JiraIssue, from: string, to: string): void {
        const f = issue.fields;
        if (f.reporter && inRange(f.created, from, to)) {
            RecordEvent(f.reporter, 'created', 'created', issue, 'Ticket cree', f.created);
        }
        for (const c of f.comment?.comments || []) {
            if (inRange(c.created, from, to)) RecordEvent(c.author, 'comments', 'comment', issue, 'Commentaire', c.created);
        }
        for (const h of issue.changelog?.histories || []) {
            if (!h.author || !inRange(h.created, from, to)) continue;
            h.items.forEach(item => recordChangelogItem(RecordEvent, h, item, issue));
        }
    }

    const activityScore = (u: JiraUser) => u.comments + u.transitions + u.assigned;

    async function userActivity(from: string, to: string): Promise<JiraUser[]> {
        const jql = `project = ${config.jiraProject} AND updated >= "${from}" AND updated <= "${to} 23:59" ORDER BY updated DESC`;
        const issues = await jira.searchAll(jql, ['summary', 'comment', 'reporter', 'created'], {expand: 'changelog'});
        const {users, RecordEvent} = createActivityTracker();
        issues.forEach(issue => collectIssueActivity(RecordEvent, issue, from, to));
        return [...users.values()]
            .map(u => ({...u, events: u.events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_EVENTS_PER_USER)}))
            .sort((a, b) => activityScore(b) - activityScore(a));
    }

    // Unresolved issues with a fix version, ordered by JIRA_STATUS_ORDER
    async function versionedIssues(): Promise<VersionedIssue[]> {
        const jql = `project = ${config.jiraProject} AND fixVersion is not EMPTY AND statusCategory != Done ORDER BY updated DESC`;
        const issues = await jira.searchAll(jql, ['summary', 'status', 'assignee', 'fixVersions', 'issuetype', 'priority', 'updated']);
        const rank = statusRank(config.jiraStatusOrder);
        return issues
            .map(i => ({
                key: i.key,
                summary: i.fields.summary,
                url: browseUrl(i.key),
                status: i.fields.status.name,
                category: i.fields.status.statusCategory?.id ?? 9,
                assignee: i.fields.assignee?.displayName,
                avatar: i.fields.assignee?.avatarUrls?.['24x24'],
                versions: i.fields.fixVersions.map(v => v.name),
                type: i.fields.issuetype?.name,
                priority: i.fields.priority?.name,
                updated: i.fields.updated,
            }))
            .sort((a, b) => rank(a.status) - rank(b.status) || a.category - b.category
                || a.status.localeCompare(b.status) || b.updated.localeCompare(a.updated));
    }

    return async function jiraData(from: string, to: string): Promise<JiraData> {
        const [versioned, users] = await Promise.all([versionedIssues(), userActivity(from, to)]);
        return {versioned, users};
    };
}
