import {Config} from '../config';

export type Params = Record<string, string | number | undefined>;

export interface GitlabClient {
    get<T>(path: string, params?: Params): Promise<T>;
    getAll<T>(path: string, params?: Params, maxPages?: number): Promise<T[]>;
}

export function createGitlabClient(config: Config): GitlabClient {
    const base = `${config.gitlabUrl}/api/v4`;

    async function get<T>(path: string, params: Params = {}): Promise<T> {
        const url = new URL(`${base}${path}`);
        Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)));
        const r = await fetch(url, {headers: {'PRIVATE-TOKEN': config.gitlabToken}});
        if (!r.ok) {
            const hint = r.status === 404 ? ' - verifier GITLAB_URL (sans /api), le token (scope read_api) et les project id' : '';
            throw new Error(`GitLab ${r.status} sur ${base}${path}${hint}`);
        }
        return r.json() as Promise<T>;
    }

    async function getAll<T>(path: string, params: Params = {}, maxPages = 10): Promise<T[]> {
        const out: T[] = [];
        for (let page = 1; page <= maxPages; page++) {
            const rows = await get<T[]>(path, {...params, per_page: 100, page});
            out.push(...rows);
            if (rows.length < 100) break;
        }
        return out;
    }

    return {get, getAll};
}
