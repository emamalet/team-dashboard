export const day = (d: string, end = false): string => `${d}T${end ? '23:59:59' : '00:00:00'}Z`;

export const shiftDay = (d: string, n: number): string =>
    new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export const inRange = (iso: string, from: string, to: string): boolean => {
    const t = Date.parse(iso);
    return t >= Date.parse(day(from)) && t <= Date.parse(day(to, true));
};

// Runs fn on each item with at most n concurrent calls, preserving order.
export async function mapLimit<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = [];
    let i = 0;
    await Promise.all(Array.from({length: n}, async () => {
        while (i < items.length) {
            const k = i++;
            out[k] = await fn(items[k]);
        }
    }));
    return out;
}

// Error message including the chain of causes (Node's fetch only says "fetch failed", the reason is in cause).
export function errorMessage(e: unknown): string {
    const parts: string[] = [];
    for (let cur: unknown = e, i = 0; cur !== undefined && cur !== null && i < 5; i++) {
        if (cur instanceof Error) {
            const code = (cur as {code?: unknown}).code;
            parts.push(code ? `${cur.message} (${String(code)})` : cur.message);
            cur = cur.cause;
        } else {
            parts.push(String(cur));
            break;
        }
    }
    return parts.join(' <- ');
}

// fetch that reports the URL and the network cause (DNS, proxy, TLS, timeout...) instead of "fetch failed".
export async function loggedFetch(service: string, url: string | URL, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (e) {
        throw new Error(`${service}: appel reseau impossible vers ${String(url)} : ${errorMessage(e)}`, {cause: e});
    }
}

// Short excerpt of an HTTP error body, to explain a non-2xx answer.
export async function bodyExcerpt(r: Response): Promise<string> {
    const text = await r.text().catch(() => '');
    return text ? ` - ${text.replace(/\s+/g, ' ').slice(0, 500)}` : '';
}

export const globToRegExp = (g: string): RegExp =>
    new RegExp(`^${g.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

export const normalize = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Rank of a status in a display order (unknown statuses go last).
export function statusRank(order: string[]): (status: string) => number {
    const wanted = order.map(normalize);
    return status => {
        const i = wanted.indexOf(normalize(status));
        return i < 0 ? wanted.length : i;
    };
}
