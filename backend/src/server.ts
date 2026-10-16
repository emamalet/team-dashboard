// Team dashboard: Git / Jira / Pipelines API.
import {createGitlabClient} from './clients/gitlab';
import {createJiraClient} from './clients/jira';
import {Config, loadConfig} from './config';
import {createServer} from './http';
import {createGitService} from './services/git';
import {createJiraService} from './services/jira';
import {createPipelineService} from './services/pipelines';

let config: Config;
try {
    config = loadConfig();
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}

const gitlab = createGitlabClient(config);
const jira = createJiraClient(config);

const routes = {
    '/api/git': createGitService({config, gitlab}),
    '/api/jira': createJiraService({config, jira}),
    '/api/pipelines': createPipelineService({config, gitlab}),
};

createServer(routes).listen(config.port, () => console.log(`Supervision sur http://localhost:${config.port}`));
