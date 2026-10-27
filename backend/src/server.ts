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

const gitlab = createGitlabClient(config);
const jira = createJiraClient(config);

// A tab whose variables are not all set answers with the list of missing ones.
const guarded = (feature: Feature, handler: ApiHandler): ApiHandler => async (from, to) => {
    if (config.missing[feature].length) throw new NotConfiguredError(config.missing[feature]);
    return handler(from, to);
};

const routes = {
    '/api/git': guarded('git', createGitService({config, gitlab})),
    '/api/jira': guarded('jira', createJiraService({config, jira})),
    '/api/versions': guarded('versions', createVersionService({config, jira})),
    '/api/pipelines': guarded('pipelines', createPipelineService({config, gitlab})),
};

createServer(routes).listen(config.port, () => console.log(`Supervision sur http://localhost:${config.port}`));
