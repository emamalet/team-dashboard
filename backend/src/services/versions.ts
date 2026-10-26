import {Config} from '../config';
import {JiraClient, JiraIssue} from '../clients/jira';
import {Range, VersionForecast, VersionIssue, VersionsData} from '../models';
import {statusRank} from '../utils';

const iso = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Cumulative {
    dev: Range<number>;
    test: Range<number>;
}

export function createVersionService({config, jira}: { config: Config; jira: JiraClient }) {
    const isWorkingDay = (d: Date): boolean => (d.getDay() + 6) % 7 < config.workDaysPerWeek;
    const rank = statusRank(config.jiraStatusOrder);

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

    function estimate(issue: JiraIssue, field: string, divisor: number): number | undefined {
        const value = issue.fields[field];
        return typeof value === 'number' && value > 0 ? value / divisor : undefined;
    }

    // Sum of estimates; unestimated issues count for the optimistic / pessimistic default.
    function total(values: (number | undefined)[]): Range<number> {
        const sum = (fallback: number) => values.reduce<number>((s, v) => s + (v ?? fallback), 0);
        return {optimistic: sum(config.unestimatedMinDays), pessimistic: sum(config.unestimatedMaxDays)};
    }

    const add = (a: Range<number>, b: Range<number>): Range<number> =>
        ({optimistic: a.optimistic + b.optimistic, pessimistic: a.pessimistic + b.pessimistic});
    const finish = (dev: Range<number>, test: Range<number>, key: keyof Range<number>): string =>
        deliveryDate(Math.max(dev[key] / config.teamDevs, test[key] / config.teamTesters));

    // `done` is the workload of the previous versions: they must be finished before this one starts.
    function forecast(name: string, releaseDate: string | undefined, issues: JiraIssue[], done: Cumulative, after?: string): VersionForecast {
        const rows: VersionIssue[] = issues.map(i => ({
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
        const devDays = total(rows.map(r => r.devDays));
        const testDays = total(rows.map(r => r.testDays));
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
            config.jiraDevEstimateField, config.jiraTestEstimateField]);
        return {
            team: {
                devs: config.teamDevs, testers: config.teamTesters, workDaysPerWeek: config.workDaysPerWeek,
                unestimatedMin: config.unestimatedMinDays, unestimatedMax: config.unestimatedMaxDays,
            },
            versions: versions.map((v, n) => forecast(v.name, v.releaseDate,
                issues.filter(i => i.fields.fixVersions.some(f => f.name === v.name)), done, versions[n - 1]?.name)),
        };
    };
}
