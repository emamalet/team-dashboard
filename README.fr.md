# Team Dashboard

[English](README.md) | **Français**

Tableau de bord pour une équipe utilisant GitLab et Jira : onglets Git, Jira et Pipelines (déploiements).

```
backend/    API Node.js (TypeScript, sans dépendance d'exécution)
frontend/   Application Angular (TypeScript, templates HTML et CSS séparés)
```

## Backend

```
backend/src/server.ts      point d'entrée (assemble config, clients, services)
backend/src/config.ts      lecture et validation des variables d'environnement
backend/src/models.ts      contrat de l'API (miroir : frontend/src/app/core/models.ts)
backend/src/clients/       clients HTTP GitLab et Jira
backend/src/services/      logique métier : git, jira, pipelines
backend/src/http.ts        serveur HTTP (API + build du frontend)
```

### Configuration

Toute la configuration passe par des variables d'environnement (ou `backend/.env`, non versionné).
Aucune valeur par défaut. Seul `PORT` est obligatoire : chaque onglet est activé quand toutes ses variables sont renseignées, sinon il affiche `Veuillez renseigner les variables : ... dans le fichier backend/.env`.

- **Git** : `GITLAB_URL`, `GITLAB_TOKEN`, `GITLAB_PROJECT_ID`, `GITLAB_PROJECT_PATH`, `COMMITS_PER_DEV`
- **Pipelines** : `GITLAB_URL`, `GITLAB_TOKEN`, `GITLAB_PROJECT_ID`, `GITLAB_DEPLOY_PROJECT_ID`, `DEPLOY_*`
- **Jira** : `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_PROJECT`, `JIRA_STATUS_ORDER`
- **Versions** : celles de Jira, plus les variables d'estimation, d'équipe et de tickets non chiffrés

Une variable renseignée doit rester valide, sinon le serveur refuse de démarrer.
Copiez `backend/.env.example` vers `backend/.env` et renseignez-le.

| Variable | Description |
|---|---|
| `PORT` | Port d'écoute |
| `COMMITS_PER_DEV` | Nombre de pushs récents affichés par développeur |
| `GITLAB_URL` | URL de l'instance GitLab (sans `/api`) |
| `GITLAB_TOKEN` | Token GitLab (scope `read_api`) |
| `GITLAB_PROJECT_ID` | Id du projet de code (Git, MR, pipelines en échec) |
| `GITLAB_PROJECT_PATH` | Chemin du projet dans l'URL (liens vers les commits) |
| `GITLAB_DEPLOY_PROJECT_ID` | Id du projet dont les pipelines sont des déploiements |
| `DEPLOY_ENV_VARIABLES` | Variables de pipeline contenant l'environnement cible (liste séparée par des virgules) |
| `DEPLOY_VERSION_VARIABLES` | Variables de pipeline contenant la version (la première renseignée est retenue) |
| `DEPLOY_ENVIRONMENTS` | JSON `{"libellé":"valeur"}` des environnements suivis |
| `JIRA_URL` | URL Jira Cloud |
| `JIRA_EMAIL` / `JIRA_TOKEN` | Compte et token API Atlassian |
| `JIRA_PROJECT` | Clé du projet Jira |
| `JIRA_STATUS_ORDER` | Ordre des statuts (séparés par des virgules), aussi utilisé pour trier les tableaux Versions |
| `JIRA_DEV_ESTIMATE_FIELD` / `JIRA_TEST_ESTIMATE_FIELD` | Ids des champs Jira d'estimation dev / test |
| `JIRA_DEV_ESTIMATE_DIVISOR` / `JIRA_TEST_ESTIMATE_DIVISOR` | Diviseurs de la valeur du champ pour obtenir des jours (1 = jours, 28800 = secondes avec jours de 8h) |
| `TEAM_DEVS` / `TEAM_TESTERS` | Devs et testeurs à temps plein (décimaux permis), pour la prévision de l'onglet Versions |
| `WORK_DAYS_PER_WEEK` | Jours travaillés par semaine, à partir du lundi (1-7) |
| `UNESTIMATED_MIN_DAYS` / `UNESTIMATED_MAX_DAYS` | Jours supposés pour un ticket non chiffré (optimiste / pessimiste) |

## Frontend

```
frontend/src/app/core/       modèles, service API, état partagé (période, recherche)
frontend/src/app/shared/     composants et pipes réutilisables
frontend/src/app/features/   une page par onglet (git, jira, pipelines) et ses composants
frontend/src/styles.css      styles globaux ; chaque composant a son .html et son .css
```

Le HTML est écrit uniquement dans des templates Angular (`*.html`) : aucun JavaScript ne construit de HTML.

## Lancement

Renseignez `backend/.env`, puis **une seule commande** (depuis la racine) :

```powershell
npm start          # installe, build le frontend et lance sur http://localhost:<PORT>
npm run docker     # ou avec Docker (aucun Node requis) : docker compose --env-file backend/.env up --build
```

Développement (rechargement à chaud, le frontend proxifie `/api` vers le backend) :

```powershell
cd backend; npm start
cd frontend; $env:BACKEND_URL="http://localhost:<PORT>"; npm start   # http://localhost:4200
```

Ne commitez jamais `.env`.

### Windows sans aucun outil installé

Chaque push sur `main` déclenche `.github/workflows/release-windows.yml`, qui publie `team-dashboard-windows.zip` (application + `node.exe` portable) dans la release GitHub `latest`. Décompressez-le, copiez `backend\.env.example` en `backend\.env`, renseignez-le, puis lancez `Team dashboard.exe` (icône Angular) : aucune fenêtre de terminal, le serveur tourne en arrière-plan et le navigateur s'ouvre automatiquement. L'icône de la zone de notification propose d'ouvrir le dashboard, de démarrer avec Windows et de quitter ; quitter (ou tuer l'exe) arrête toujours le serveur et libère le port. Si le port est déjà utilisé, le lanceur arrête un ancien serveur du package, ou demande confirmation avant d'arrêter un autre programme. Logs : `backend\dashboard.log` et `backend\dashboard.err.log`. Le code du lanceur est `scripts/launcher/TeamDashboard.cs`, compilé par le workflow avec le `csc` du .NET Framework de Windows.

## Licence

[MIT](LICENSE)
