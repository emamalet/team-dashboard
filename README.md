# Team Dashboard

**English** | [Français](README.fr.md)

A dashboard for teams using GitLab and Jira, with Git, Jira and Pipelines (deployments) tabs.

```
backend/    Node.js API (TypeScript, no runtime dependency)
frontend/   Angular application (TypeScript, separate HTML templates and CSS)
```

## Backend

```
backend/src/server.ts      entry point (wires config, clients, services)
backend/src/config.ts      reads and validates environment variables
backend/src/models.ts      API contract (mirror: frontend/src/app/core/models.ts)
backend/src/clients/       GitLab and Jira HTTP clients
backend/src/services/      business logic: git, jira, pipelines
backend/src/http.ts        HTTP server (API + frontend build)
```

### Configuration

All configuration comes from environment variables (or `backend/.env`, which is not versioned).
There are no default values. Only `PORT` is mandatory: each tab is enabled when all of its variables are set, otherwise it shows `Veuillez renseigner les variables : ... dans le fichier backend/.env`.

- **Git**: `GITLAB_URL`, `GITLAB_TOKEN`, `GITLAB_PROJECT_ID`, `GITLAB_PROJECT_PATH`, `COMMITS_PER_DEV`
- **Pipelines**: `GITLAB_URL`, `GITLAB_TOKEN`, `GITLAB_PROJECT_ID`, `GITLAB_DEPLOY_PROJECT_ID`, `DEPLOY_*`
- **Jira**: `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_PROJECT`, `JIRA_STATUS_ORDER`
- **Versions**: the Jira ones, plus the estimate, team and unestimated variables

A variable that is set must still be valid, otherwise the server refuses to start.
Copy `backend/.env.example` to `backend/.env` and fill it in.

| Variable | Description |
|---|---|
| `PORT` | Listening port |
| `COMMITS_PER_DEV` | Number of recent pushes shown per developer |
| `GITLAB_URL` | GitLab instance URL (without `/api`) |
| `GITLAB_TOKEN` | GitLab token (`read_api` scope) |
| `GITLAB_PROJECT_ID` | Id of the code project (Git, MRs, failed pipelines) |
| `GITLAB_PROJECT_PATH` | Project path in the URL (used for commit links) |
| `GITLAB_DEPLOY_PROJECT_ID` | Id of the project whose pipelines are deployments |
| `DEPLOY_ENV_VARIABLES` | Pipeline variables holding the target environment (comma-separated) |
| `DEPLOY_VERSION_VARIABLES` | Pipeline variables holding the version (the first one set wins) |
| `DEPLOY_ENVIRONMENTS` | JSON `{"label":"value"}` of the tracked environments |
| `JIRA_URL` | Jira Cloud URL |
| `JIRA_EMAIL` / `JIRA_TOKEN` | Atlassian account and API token |
| `JIRA_PROJECT` | Jira project key |
| `JIRA_STATUS_ORDER` | Status display order (comma-separated), also used to sort the Versions tables |
| `JIRA_DEV_ESTIMATE_FIELD` / `JIRA_TEST_ESTIMATE_FIELD` | Jira field ids holding the dev / test estimates |
| `JIRA_DEV_ESTIMATE_DIVISOR` / `JIRA_TEST_ESTIMATE_DIVISOR` | Divide the field value to get days (1 = days, 28800 = seconds with 8h days) |
| `TEAM_DEVS` / `TEAM_TESTERS` | Full-time devs (decimals allowed) and testers, for the Versions forecast |
| `WORK_DAYS_PER_WEEK` | Working days per week, Monday first (1-7) |
| `UNESTIMATED_MIN_DAYS` / `UNESTIMATED_MAX_DAYS` | Days assumed for an unestimated issue (optimistic / pessimistic) |

## Frontend

```
frontend/src/app/core/       models, API service, shared state (period, search)
frontend/src/app/shared/     reusable components and pipes
frontend/src/app/features/   one page per tab (git, jira, pipelines) and its components
frontend/src/styles.css      global styles; each component has its own .html and .css
```

HTML is written only in Angular templates (`*.html`): no JavaScript builds HTML.

## Getting started

Fill in `backend/.env`, then run **a single command** (from the root):

```powershell
npm start          # installs, builds the frontend and serves on http://localhost:<PORT>
npm run docker     # or with Docker (no Node required): docker compose --env-file backend/.env up --build
```

Development (hot reload, the frontend proxies `/api` to the backend):

```powershell
cd backend; npm start
cd frontend; $env:BACKEND_URL="http://localhost:<PORT>"; npm start   # http://localhost:4200
```

Never commit `.env`.

### Windows without any tool installed

Every push on `main` triggers `.github/workflows/release-windows.yml`, which publishes `team-dashboard-windows.zip` (app + portable `node.exe`) on the `latest` GitHub release. Unzip it, copy `backend\.env.example` to `backend\.env`, fill it in, then run `Team dashboard.exe` (Angular icon): no terminal window, the server runs in the background and the browser opens automatically. The tray icon offers open the dashboard, start with Windows, and quit; quitting (or killing the exe) always stops the server and frees the port. If the port is already used, the launcher stops a leftover server of the package, or asks before stopping another program. Logs: `backend\dashboard.log` and `backend\dashboard.err.log`. The launcher source is `scripts/launcher/TeamDashboard.cs`, compiled by the workflow with the .NET Framework `csc` of Windows.

## License

[MIT](LICENSE)
