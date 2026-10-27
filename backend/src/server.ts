// Team dashboard: Git / Jira / Pipelines API.
import {createGitlabClient} from './clients/gitlab';
import {createJiraClient} from './clients/jira';
import {Config, Feature, loadConfig, NotConfiguredError} from './config';
import {ApiHandler, createServer} from './http';
import {createGitService} from './services/git';
import {createJiraService} from './services/jira';
import {createVersionService} from './services/versions';
import {createPipelineService} from './services/pipelines';
import {errorMessage} from './utils';
import {createSettingsApi} from './settings';

let config: Config;
try {
    config = loadConfig();
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}

process.on('unhandledRejection', reason => console.error(`[${new Date().toISOString()}] unhandledRejection : ${errorMessage(reason)}`));
process.on('uncaughtException', e => {
    console.error(`[${new Date().toISOString()}] uncaughtException : ${e.stack ?? errorMessage(e)}`);
    process.exit(1);
});

// A tab whose variables are not all set answers with the list of missing ones.
const guarded = (config: Config, feature: Feature, handler: ApiHandler): ApiHandler => async (from, to) => {
    if (config.missing[feature].length) throw new NotConfiguredError(config.missing[feature]);
    return handler(from, to);
};

const routes: Record<string, ApiHandler> = {};

// (Re)builds clients and services: also used when the configuration is edited from the interface.
function applyConfig(config: Config): void {
    const gitlab = createGitlabClient(config);
    const jira = createJiraClient(config);
    Object.assign(routes, {
        '/api/git': guarded(config, 'git', createGitService({config, gitlab})),
        '/api/jira': guarded(config, 'jira', createJiraService({config, jira})),
        '/api/versions': guarded(config, 'versions', createVersionService({config, jira})),
        '/api/pipelines': guarded(config, 'pipelines', createPipelineService({config, gitlab})),
    });
}

applyConfig(config);
const settings = createSettingsApi(() => config.port, applyConfig);

createServer(routes, settings).listen(config.port, () => console.log(`Supervision sur http://localhost:${config.port}`));
