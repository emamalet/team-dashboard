import {Config} from '../config';
import {GitlabClient} from '../clients/gitlab';
import {Developer, GitData, MergeRequest, PushSummary} from '../models';
import {mapLimit, shiftDay} from '../utils';

interface GitlabUser {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
}

interface GitlabMergeRequest {
    iid: number;
    title: string;
    web_url: string;
    draft?: boolean;
    source_branch: string;
    target_branch: string;
    author?: GitlabUser;
    reviewers?: GitlabUser[];
    created_at: string;
    updated_at: string;
    user_notes_count?: number;
    has_conflicts?: boolean;
    detailed_merge_status?: string;
    head_pipeline?: { status: string };
}

interface GitlabPushEvent {
    created_at: string;
    author?: GitlabUser;
    push_data?: {
        commit_to?: string;
        commit_title?: string;
        commit_count?: number;
        ref: string;
        action: string;
    };
}

interface DeveloperAccumulator {
    name: string;
    username: string;
    avatar?: string;
    pushes: number;
    heads: Set<string | undefined>;
    branches: Set<string>;
    days: Set<string>;
    last: PushSummary[];
}

export function createGitService({config, gitlab}: { config: Config; gitlab: GitlabClient }) {
    const projectUrl = `${config.gitlabUrl}/${config.gitlabProjectPath}`;
    const projectApi = `/projects/${config.gitlabProjectId}`;

    async function openMergeRequests(): Promise<MergeRequest[]> {
        const list = await gitlab.get<GitlabMergeRequest[]>(`${projectApi}/merge_requests`, {
            state: 'opened', order_by: 'updated_at', sort: 'desc', per_page: 60,
        });
        return mapLimit(list, 8, async m => {
            const detail = await gitlab.get<GitlabMergeRequest>(`${projectApi}/merge_requests/${m.iid}`).catch(() => m);
            return {
                iid: m.iid, title: m.title, url: m.web_url, draft: !!m.draft,
                source: m.source_branch, target: m.target_branch,
                author: m.author?.name, avatar: m.author?.avatar_url,
                reviewers: (m.reviewers || []).map(r => r.name),
                created: m.created_at, updated: m.updated_at,
                conflicts: !!detail.has_conflicts, merge: detail.detailed_merge_status,
                pipeline: detail.head_pipeline?.status || null, comments: m.user_notes_count || 0,
            };
        });
    }

    const newDeveloper = (author: GitlabUser): DeveloperAccumulator => ({
        name: author.name, username: author.username, avatar: author.avatar_url,
        pushes: 0, heads: new Set(), branches: new Set(), days: new Set(), last: [],
    });

    function toPushSummary(event: GitlabPushEvent, push: NonNullable<GitlabPushEvent['push_data']>): PushSummary {
        return {
            sha: (push.commit_to || '').slice(0, 8),
            title: push.commit_title || '',
            ref: push.ref,
            date: event.created_at,
            created: push.action === 'created',
            removed: push.action === 'removed',
            count: push.commit_count || 0,
            url: push.commit_to ? `${projectUrl}/-/commit/${push.commit_to}` : projectUrl,
        };
    }

    // Git activity = "push" events (same as each person's GitLab profile)
    function groupPushesByDeveloper(events: GitlabPushEvent[]): Developer[] {
        const devs = new Map<number, DeveloperAccumulator>();
        for (const event of events) {
            const push = event.push_data;
            if (!push || !event.author) continue;
            if (!devs.has(event.author.id)) devs.set(event.author.id, newDeveloper(event.author));
            const dev = devs.get(event.author.id)!;
            dev.pushes++;
            dev.heads.add(push.commit_to);
            dev.branches.add(push.ref);
            dev.days.add(event.created_at.slice(0, 10));
            if (dev.last.length < config.commitsPerDev) dev.last.push(toPushSummary(event, push));
        }
        return [...devs.values()]
            .map(({heads, branches, days, ...dev}) => ({
                ...dev,
                commits: heads.size,
                branches: [...branches],
                days: days.size,
                lastActivity: dev.last[0]?.date,
            }))
            .sort((a, b) => b.pushes - a.pushes);
    }

    return async function gitData(from: string, to: string): Promise<GitData> {
        const [events, mrs] = await Promise.all([
            gitlab.getAll<GitlabPushEvent>(`${projectApi}/events`, {action: 'pushed', after: shiftDay(from, -1), before: shiftDay(to, 1)}, 40),
            openMergeRequests(),
        ]);
        return {mrs, devs: groupPushesByDeveloper(events)};
    };
}
