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
