# Team Dashboard

**English** | [Français](README.fr.md)

A dashboard for teams using GitLab and Jira, with four tabs:

- **Git**: merge requests and developer activity
- **Jira**: tickets with a version, activity per user
- **Versions**: forecast delivery dates of the in-progress versions (team capacity, dev and test estimates), and issues without estimates
- **Pipelines**: deployments per environment and failed pipelines

## Quick start

### 1. Windows, nothing to install (recommended)

1. Download `team-dashboard-windows.zip` from the [`latest` release](../../releases/tag/latest) (rebuilt on every push on `main`) and unzip it.
2. Run `Team dashboard.exe`: on first launch it creates `backend\.env` (only `PORT`) and opens the **Configuration** page (⚙ icon in the header, or tray menu) where you fill in the rest (see [Configuration](#configuration)).

No terminal: the server runs in the background and the browser opens by itself. The tray icon lets you open the dashboard, start with Windows, or quit. Quitting (or killing the exe) always stops the server and frees the port. If the port is already used, a leftover server of the package is stopped, otherwise you are asked before another program is stopped. Logs: `backend\dashboard.log` and `backend\dashboard.err.log`.

### 2. From the sources

Requires Node 20. Fill in `backend/.env`, then, from the root:

```powershell
npm start          # installs, builds and serves on http://localhost:<PORT>
npm run docker     # or with Docker, no Node needed
```

### 3. Development

Hot reload, the frontend proxies `/api` to the backend:

```powershell
cd backend; npm start
cd frontend; $env:BACKEND_URL="http://localhost:<PORT>"; npm start   # http://localhost:4200
```

Never commit `.env`.

## Configuration

Everything comes from environment variables or `backend/.env` (not versioned), with **no default values**. Only `PORT` is mandatory: a tab is enabled when all of its variables are set, otherwise it lists the missing ones and links to the Configuration page. A variable that is set must be valid, otherwise the server refuses to start.

The **⚙ Configuration** page edits `backend/.env` (secrets are never shown back; leave a token empty to keep it) and applies changes immediately, except `PORT` which needs a restart. It is only reachable from `localhost`, so with Docker edit `backend/.env` directly.

| Variable | Tab | Description |
|---|---|---|
| `PORT` | all | Listening port |
| `GITLAB_URL` | Git, Pipelines | GitLab instance URL (without `/api`) |
| `GITLAB_TOKEN` | Git, Pipelines | GitLab token (`read_api` scope) |
| `GITLAB_PROJECT_ID` | Git, Pipelines | Id of the code project (MRs, failed pipelines) |
| `GITLAB_PROJECT_PATH` | Git | Project path in the URL (commit links) |
| `COMMITS_PER_DEV` | Git | Number of recent pushes shown per developer |
| `GITLAB_DEPLOY_PROJECT_ID` | Pipelines | Id of the project whose pipelines are deployments |
| `DEPLOY_ENV_VARIABLES` | Pipelines | Pipeline variables holding the target environment (comma-separated) |
| `DEPLOY_VERSION_VARIABLES` | Pipelines | Pipeline variables holding the version (the first one set wins) |
| `DEPLOY_ENVIRONMENTS` | Pipelines | JSON `{"label":"value"}` of the tracked environments |
| `JIRA_URL` | Jira, Versions | Jira Cloud URL |
| `JIRA_EMAIL` / `JIRA_TOKEN` | Jira, Versions | Atlassian account and API token |
| `JIRA_PROJECT` | Jira, Versions | Jira project key |
| `JIRA_STATUS_ORDER` | Jira, Versions | Status display order (comma-separated); also sorts the Versions tables |
| `JIRA_DEV_ESTIMATE_FIELD` / `JIRA_TEST_ESTIMATE_FIELD` | Versions | Jira field ids holding the dev / test estimates |
| `JIRA_DEV_ESTIMATE_DIVISOR` / `JIRA_TEST_ESTIMATE_DIVISOR` | Versions | Divide the field value to get days (1 = days, 28800 = seconds with 8h days) |
| `TEAM_DEVS` / `TEAM_TESTERS` | Versions | Full-time devs (decimals allowed) and testers |
| `WORK_DAYS_PER_WEEK` | Versions | Working days per week, Monday first (1-7) |
| `UNESTIMATED_MIN_DAYS` / `UNESTIMATED_MAX_DAYS` | Versions | Days assumed for an unestimated issue (optimistic / pessimistic) |

### How the Versions forecast works

- Only unreleased, unarchived versions are listed, sorted by number.
- Workload = sum of the remaining estimates; an unestimated issue counts for the optimistic / pessimistic value.
- Devs and testers work in parallel: delivery date = slowest of (dev workload / devs) and (test workload / testers), in working days from today.
- Versions are chained: each one includes the workload of the previous ones, so adding work to 4.17.2 pushes back 4.18.0.

## Architecture

```
backend/    Node.js API (TypeScript, no runtime dependency)
frontend/   Angular application (separate HTML templates and CSS)
scripts/launcher/   Windows tray launcher (C#), compiled by the CI
```

```
backend/src/server.ts      entry point (wires config, clients, services)
backend/src/config.ts      reads and validates environment variables, enabled tabs
backend/src/models.ts      API contract (mirror: frontend/src/app/core/models.ts)
backend/src/clients/       GitLab and Jira HTTP clients
backend/src/services/      business logic: git, jira, versions, pipelines
backend/src/http.ts        HTTP server (API + frontend build)

frontend/src/app/core/       models, API service, shared state (period, search)
frontend/src/app/shared/     reusable components and pipes
frontend/src/app/features/   one page per tab and its components
frontend/src/styles.css      global styles; each component has its own .html and .css
```

HTML is written only in Angular templates (`*.html`): no JavaScript builds HTML.

The Windows package is built by `.github/workflows/release-windows.yml` (frontend + backend + portable `node.exe` + launcher) and published as the `latest` release.

## License

[MIT](LICENSE)
