import {Config} from '../config';
import {JiraClient, JiraIssue} from '../clients/jira';
import {Range, VersionForecast, VersionIssue, VersionsData} from '../models';
import {normalize, statusRank} from '../utils';

const iso = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Cumulative {
    dev: Range<number>;
    test: Range<number>;
}

export function createVersionService({config, jira}: { config: Config; jira: JiraClient }) {
    const isWorkingDay = (d: Date): boolean => (d.getDay() + 6) % 7 < config.workDaysPerWeek;
    const rank = statusRank(config.jiraStatusOrder);
    const devDone = new Set(config.devDoneStatuses.map(normalize));
    const excludedTypes = new Set(config.excludedIssueTypes.map(normalize));

    // Date on which `days` working days of work, started today, are completed.
    function deliveryDate(days: number): string {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        while (!isWorkingDay(d)) d.setDate(d.getDate() + 1);
        let left = Math.ceil(days);
        while (left > 1) {
            d.setDate(d.getDate() + 1);
            if (isWorkingDay(d)) left--;
        }
        return iso(d);
    }

    function parseEstimate(raw: unknown, divisor: number): number | undefined {
        if (typeof raw === 'number') return raw >= 0 ? raw / divisor : undefined;
        if (typeof raw !== 'string') return undefined;
        // Text values like "0,5d", "4h", "30m", "1w": convert known units to days (Jira convention: 8h/day, 5d/week); unknown letters are ignored.
        const m = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)/.exec(raw);
        if (!m) return undefined;
        const n = Number(m[1].replace(',', '.'));
        const perDay: Record<string, number> = {d: 1, j: 1, h: 1 / 8, m: 1 / 480, w: 5, s: 5};
        const factor = perDay[m[2].toLowerCase().charAt(0)];
        return factor === undefined ? n / divisor : n * factor;
    }

    // First field holding a usable value wins.
    function estimate(issue: JiraIssue, fields: string[], divisor: number): number | undefined {
        for (const f of fields) {
            const v = parseEstimate(issue.fields[f], divisor);
            if (v !== undefined) return v;
        }
        return undefined;
    }

    // Sum of estimates; unestimated issues count for the optimistic / pessimistic default.
    function total(values: (number | undefined)[], min: number, max: number): Range<number> {
        const sum = (fallback: number) => values.reduce<number>((s, v) => s + (v ?? fallback), 0);
        return {optimistic: sum(min), pessimistic: sum(max)};
    }

    const add = (a: Range<number>, b: Range<number>): Range<number> =>
        ({optimistic: a.optimistic + b.optimistic, pessimistic: a.pessimistic + b.pessimistic});
    const finish = (dev: Range<number>, test: Range<number>, key: keyof Range<number>): string =>
        deliveryDate(Math.max(dev[key] / config.teamDevs, test[key] / config.teamTesters));

    // `done` is the workload of the previous versions: they must be finished before this one starts.
    function forecast(name: string, releaseDate: string | undefined, issues: JiraIssue[], done: Cumulative, after?: string): VersionForecast {
        // Excluded types (epics grouping other issues, tasks, sub-tasks) are neither listed nor counted.
        const rows: VersionIssue[] = issues.filter(i => !excludedTypes.has(normalize(i.fields.issuetype?.name ?? ''))).map(i => ({
            key: i.key,
            summary: i.fields.summary,
            url: `${config.jiraUrl}/browse/${i.key}`,
            status: i.fields.status.name,
            assignee: i.fields.assignee?.displayName,
            avatar: i.fields.assignee?.avatarUrls?.['24x24'],
            type: i.fields.issuetype?.name,
            devDays: estimate(i, config.jiraDevEstimateField, config.jiraDevEstimateDivisor),
            testDays: estimate(i, config.jiraTestEstimateField, config.jiraTestEstimateDivisor),
        }));
        rows.sort((a, b) => rank(a.status) - rank(b.status) || a.status.localeCompare(b.status) || a.key.localeCompare(b.key, undefined, {numeric: true}));
        // Once dev is over, the dev estimate is irrelevant.
        const devDays = total(rows.filter(r => !devDone.has(normalize(r.status))).map(r => r.devDays), config.unestimatedMinDays, config.unestimatedMaxDays);
        const testDays = total(rows.map(r => r.testDays), config.unestimatedTestMinDays, config.unestimatedTestMaxDays);
        // Devs and the tester work in parallel: the slowest stream sets the delivery date.
        const devDuration = {optimistic: devDays.optimistic / config.teamDevs, pessimistic: devDays.pessimistic / config.teamDevs};
        const testDuration = {optimistic: testDays.optimistic / config.teamTesters, pessimistic: testDays.pessimistic / config.teamTesters};
        const cumulDev = add(done.dev, devDays), cumulTest = add(done.test, testDays);
        done.dev = cumulDev;
        done.test = cumulTest;
        return {
            name, after, releaseDate, issues: rows, devDays, testDays, devDuration, testDuration,
            delivery: {
                optimistic: finish(cumulDev, cumulTest, 'optimistic'),
                pessimistic: finish(cumulDev, cumulTest, 'pessimistic'),
            },
        };
    }

    return async function versionsData(): Promise<VersionsData> {
        const versions = (await jira.projectVersions(config.jiraProject))
            .filter(v => !v.released && !v.archived)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
        const done: Cumulative = {dev: {optimistic: 0, pessimistic: 0}, test: {optimistic: 0, pessimistic: 0}};
        const jql = `project = ${config.jiraProject} AND fixVersion in unreleasedVersions(${config.jiraProject}) AND statusCategory != Done ORDER BY key ASC`;
        const issues = await jira.searchAll(jql, ['summary', 'status', 'assignee', 'fixVersions', 'issuetype',
            ...config.jiraDevEstimateField, ...config.jiraTestEstimateField]);
        return {
            team: {
                devs: config.teamDevs, testers: config.teamTesters, workDaysPerWeek: config.workDaysPerWeek,
                unestimatedMin: config.unestimatedMinDays, unestimatedMax: config.unestimatedMaxDays,
                unestimatedTestMin: config.unestimatedTestMinDays, unestimatedTestMax: config.unestimatedTestMaxDays,
            },
            versions: versions.map((v, n) => forecast(v.name, v.releaseDate,
                issues.filter(i => i.fields.fixVersions.some(f => f.name === v.name)), done, versions[n - 1]?.name)),
        };
    };
}
