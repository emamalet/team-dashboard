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
Aucune valeur par défaut : le serveur refuse de démarrer si une variable manque.
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
| `JIRA_STATUS_ORDER` | Ordre des statuts (séparés par des virgules) |

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

## Licence

[MIT](LICENSE)
