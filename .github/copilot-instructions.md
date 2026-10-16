# Copilot instructions

Team dashboard (GitLab + Jira): `backend/` (Node, TypeScript) serves a JSON API and the built `frontend/` (Angular 20). User-facing text and comments are in French (without accents in most strings).

## Commands

- Full start (from repo root): `npm start` → installs and builds `frontend`, installs `backend`, compiles it (`tsc`) and runs `node dist/server.js`.
- Docker: `npm run docker` (= `docker compose --env-file backend/.env up --build`).
- Backend only: `cd backend; npm start` (compiles then runs). Type-check only: `npx tsc --noEmit`.
- Frontend build: `cd frontend; npm run build`. Dev server with hot reload: `cd frontend; $env:BACKEND_URL="http://localhost:<PORT>"; npm start` (proxies `/api`, see `frontend/proxy.conf.js`).
- There are no tests or linters configured. Node 20 is used: stay on Angular 20 (Angular 21+ requires Node 22+).

## Architecture

- `backend/src/server.ts` wires `config` → clients (`clients/gitlab.ts`, `clients/jira.ts`) → services (`services/git|jira|pipelines.ts`) → routes `/api/git`, `/api/jira`, `/api/pipelines` in `http.ts`. Each service is a factory `createXService({config, client})` returning an async `(from, to) => data` handler; dates are `YYYY-MM-DD`.
- `http.ts` also serves the Angular build from `frontend/dist/frontend/browser` (path relative to `backend/dist`) and falls back to `index.html` for client-side routes. Changing the Angular output path or backend `outDir` breaks this.
- The API contract is **duplicated**: `backend/src/models.ts` and `frontend/src/app/core/models.ts`. Update both together.
- Frontend: `core/` (ApiService with per-request cache, `DashboardState` signals for period/search/refresh), `shared/` (avatar, who, kpis, skeleton, pipes), `features/{git,jira,pipelines}` (one page component per route, lazy-loaded in `app.routes.ts`). Pages load data with `rxResource` keyed on `DashboardState` signals.
- "Pipelines" deployments are GitLab pipelines of a separate deploy project; a pipeline counts as a deployment if one of the `DEPLOY_ENV_VARIABLES` holds a value listed in `DEPLOY_ENVIRONMENTS`, and its version comes from the first non-empty `DEPLOY_VERSION_VARIABLES`.

## Conventions

- **No default values anywhere**: all configuration comes from environment variables (or `backend/.env`, never committed) read in `backend/src/config.ts`, which fails at startup listing missing variables. Add any new setting there, to `backend/.env.example` and to the README table. Nothing team- or company-specific (URLs, project ids, status names, variable names) may be hard-coded.
- **No HTML built in TypeScript**: UI markup lives only in Angular `*.html` templates (`@if`/`@for`), with a `.css` per component and shared styles in `frontend/src/styles.css`. Components use `templateUrl`/`styleUrl`, signals and `input()`.
- Person filtering is done on data in page components (`DashboardState.query`), not by hiding DOM nodes.
