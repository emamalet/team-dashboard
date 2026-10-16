import {Config} from '../config';
import {GitlabClient} from '../clients/gitlab';
import {Deployment, EnvironmentStatus, PipelineData, PipelineFailure} from '../models';
import {day, globToRegExp, inRange, mapLimit} from '../utils';

const FINISHED_STATUSES = ['success', 'failed', 'canceled'];
const MAX_PIPELINE_PAGES = 8;
const MAX_FAILURES = 80;
const MAX_HISTORY = 100;

interface GitlabPipeline {
    id: number;
    status: string;
    ref: string;
    sha: string;
    source: string;
    web_url: string;
    created_at: string;
    updated_at: string;
    started_at?: string;
    user?: { name: string; avatar_url?: string };
}

export function createPipelineService({config, gitlab}: { config: Config; gitlab: GitlabClient }) {
    const projectApi = `/projects/${config.gitlabProjectId}`;
    const deployApi = `/projects/${config.deployProjectId}`;
    const wantedEnvs = Object.values(config.deployEnvironments).map(v => v.toLowerCase());
    const deployCache = new Map<number, Deployment | null>();

    const firstValue = (vars: Record<string, string>, names: string[]) => names.map(n => vars[n]).find(Boolean);

    // A pipeline is a deployment if it carries an environment variable referencing a tracked environment.
    async function deployInfo(pipeline: GitlabPipeline): Promise<Deployment | null> {
        if (deployCache.has(pipeline.id)) return deployCache.get(pipeline.id)!;
        const variables = await gitlab.get<{ key: string; value: string }[]>(`${deployApi}/pipelines/${pipeline.id}/variables`);
        const vars = Object.fromEntries(variables.map(v => [v.key, v.value]));
        const env = config.deployEnvVariables.map(n => vars[n]).find(v => wantedEnvs.includes(v?.toLowerCase()));
        let info: Deployment | null = null;
        if (env) {
            const detail = await gitlab.get<GitlabPipeline>(`${deployApi}/pipelines/${pipeline.id}`);
            info = {
                id: pipeline.id, env: env.toLowerCase(), status: pipeline.status,
                date: detail.started_at || pipeline.created_at, url: pipeline.web_url,
                user: detail.user?.name, avatar: detail.user?.avatar_url, ref: pipeline.ref,
                version: firstValue(vars, config.deployVersionVariables) || pipeline.ref,
            };
        }
        if (FINISHED_STATUSES.includes(pipeline.status)) deployCache.set(pipeline.id, info);
        return info;
    }

    async function collectDeployments(from: string, to: string) {
        const latest = new Map<string, Deployment>(), lastSuccess = new Map<string, Deployment>();
        const history: Deployment[] = [];
        const fromTime = Date.parse(day(from));
        for (let page = 1; page <= MAX_PIPELINE_PAGES; page++) {
            const pipes = await gitlab.get<GitlabPipeline[]>(`${deployApi}/pipelines`, {order_by: 'id', sort: 'desc', per_page: 100, page});
            const deployments = (await mapLimit(pipes, 8, deployInfo)).filter((d): d is Deployment => d !== null);
            for (const d of deployments) {
                if (!latest.has(d.env)) latest.set(d.env, d);
                if (d.status === 'success' && !lastSuccess.has(d.env)) lastSuccess.set(d.env, d);
                if (inRange(d.date, from, to)) history.push(d);
            }
            const oldest = pipes.length ? Date.parse(pipes[pipes.length - 1].created_at) : 0;
            const allFound = wantedEnvs.every(e => lastSuccess.has(e));
            if (pipes.length < 100 || (oldest < fromTime && allFound)) break;
        }
        const environments: EnvironmentStatus[] = Object.entries(config.deployEnvironments).map(([label, env]) => ({
            label, env,
            latest: latest.get(env.toLowerCase()) || null,
            lastSuccess: lastSuccess.get(env.toLowerCase()) || null,
        }));
        history.sort((a, b) => b.date.localeCompare(a.date));
        return {environments, history: history.slice(0, MAX_HISTORY)};
    }

    async function protectedBranchFailures(from: string, to: string) {
        const branches = (await gitlab.get<{ name: string }[]>(`${projectApi}/protected_branches`, {per_page: 100})).map(b => b.name);
        const patterns = branches.map(globToRegExp);
        const failed = await gitlab.getAll<GitlabPipeline>(`${projectApi}/pipelines`, {
            status: 'failed', updated_after: day(from), updated_before: day(to, true),
        }, 10);
        const onProtected = failed.filter(p => patterns.some(r => r.test(p.ref))).slice(0, MAX_FAILURES);
        const failures: PipelineFailure[] = await mapLimit(onProtected, 6, async p => {
            const detail = await gitlab.get<GitlabPipeline>(`${projectApi}/pipelines/${p.id}`).catch(() => undefined);
            return {
                id: p.id, ref: p.ref, sha: p.sha.slice(0, 8), date: p.updated_at, source: p.source, url: p.web_url,
                user: detail?.user?.name, avatar: detail?.user?.avatar_url,
            };
        });
        failures.sort((a, b) => b.date.localeCompare(a.date));
        return {failures, branches};
    }

    return async function pipelineData(from: string, to: string): Promise<PipelineData> {
        const [deployments, failures] = await Promise.all([collectDeployments(from, to), protectedBranchFailures(from, to)]);
        return {...deployments, ...failures};
    };
}
