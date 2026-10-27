# Team Dashboard

[English](README.md) | **Français**

Tableau de bord pour une équipe utilisant GitLab et Jira, avec quatre onglets :

- **Git** : merge requests et activité des développeurs
- **Jira** : tickets avec une version, activité par utilisateur
- **Versions** : dates de livraison prévisionnelles des versions en cours (capacité de l'équipe, estimations dev et test), et tickets sans estimation
- **Pipelines** : déploiements par environnement et pipelines en échec

## Démarrage rapide

### 1. Windows, rien à installer (recommandé)

1. Téléchargez `team-dashboard-windows.zip` depuis la [release `latest`](../../releases/tag/latest) (reconstruite à chaque push sur `main`) et décompressez-le.
2. Lancez `Team dashboard.exe` : au premier lancement il crée `backend\.env` (avec `PORT` seulement) et ouvre la page **Configuration** (icône ⚙ dans l'en-tête, ou menu de l'icône de notification) où vous renseignez le reste (voir [Configuration](#configuration)).

Aucun terminal : le serveur tourne en arrière-plan et le navigateur s'ouvre tout seul. L'icône de la zone de notification permet d'ouvrir le dashboard, de démarrer avec Windows ou de quitter. Quitter (ou tuer l'exe) arrête toujours le serveur et libère le port. Si le port est déjà utilisé, un ancien serveur du package est arrêté, sinon une confirmation est demandée avant d'arrêter un autre programme. Logs : `backend\dashboard.log` et `backend\dashboard.err.log`.

### 2. Depuis les sources

Node 20 requis. Renseignez `backend/.env`, puis, depuis la racine :

```powershell
npm start          # installe, build et sert sur http://localhost:<PORT>
npm run docker     # ou avec Docker, sans Node
```

### 3. Développement

Rechargement à chaud, le frontend proxifie `/api` vers le backend :

```powershell
cd backend; npm start
cd frontend; $env:BACKEND_URL="http://localhost:<PORT>"; npm start   # http://localhost:4200
```

Ne commitez jamais `.env`.

## Configuration

Tout passe par des variables d'environnement ou `backend/.env` (non versionné), **sans valeur par défaut**. Seul `PORT` est obligatoire : un onglet est activé quand toutes ses variables sont renseignées, sinon il liste celles qui manquent et renvoie vers la page Configuration. Une variable renseignée doit être valide, sinon le serveur refuse de démarrer.

La page **⚙ Configuration** édite `backend/.env` (les secrets ne sont jamais réaffichés ; laissez un token vide pour le conserver) et applique les changements immédiatement, sauf `PORT` qui nécessite un redémarrage. Elle n'est accessible que depuis `localhost` : avec Docker, éditez directement `backend/.env`.

| Variable | Onglet | Description |
|---|---|---|
| `PORT` | tous | Port d'écoute |
| `GITLAB_URL` | Git, Pipelines | URL de l'instance GitLab (sans `/api`) |
| `GITLAB_TOKEN` | Git, Pipelines | Token GitLab (scope `read_api`) |
| `GITLAB_PROJECT_ID` | Git, Pipelines | Id du projet de code (MR, pipelines en échec) |
| `GITLAB_PROJECT_PATH` | Git | Chemin du projet dans l'URL (liens vers les commits) |
| `COMMITS_PER_DEV` | Git | Nombre de pushs récents affichés par développeur |
| `GITLAB_DEPLOY_PROJECT_ID` | Pipelines | Id du projet dont les pipelines sont des déploiements |
| `DEPLOY_ENV_VARIABLES` | Pipelines | Variables de pipeline contenant l'environnement cible (séparées par des virgules) |
| `DEPLOY_VERSION_VARIABLES` | Pipelines | Variables de pipeline contenant la version (la première renseignée est retenue) |
| `DEPLOY_ENVIRONMENTS` | Pipelines | JSON `{"libellé":"valeur"}` des environnements suivis |
| `JIRA_URL` | Jira, Versions | URL Jira Cloud |
| `JIRA_EMAIL` / `JIRA_TOKEN` | Jira, Versions | Compte et token API Atlassian |
| `JIRA_PROJECT` | Jira, Versions | Clé du projet Jira |
| `JIRA_STATUS_ORDER` | Jira, Versions | Ordre des statuts (séparés par des virgules) ; trie aussi les tableaux Versions |
| `JIRA_DEV_ESTIMATE_FIELD` / `JIRA_TEST_ESTIMATE_FIELD` | Versions | Ids des champs Jira d'estimation dev / test |
| `JIRA_DEV_ESTIMATE_DIVISOR` / `JIRA_TEST_ESTIMATE_DIVISOR` | Versions | Diviseurs de la valeur du champ pour obtenir des jours (1 = jours, 28800 = secondes avec jours de 8h) |
| `TEAM_DEVS` / `TEAM_TESTERS` | Versions | Devs et testeurs à temps plein (décimaux permis) |
| `WORK_DAYS_PER_WEEK` | Versions | Jours travaillés par semaine, à partir du lundi (1-7) |
| `UNESTIMATED_MIN_DAYS` / `UNESTIMATED_MAX_DAYS` | Versions | Jours supposés pour un ticket non chiffré (optimiste / pessimiste) |

### Calcul de la prévision des versions

- Seules les versions non livrées et non archivées sont listées, triées par numéro.
- Charge = somme des estimations restantes ; un ticket non chiffré compte pour la valeur optimiste / pessimiste.
- Devs et testeurs travaillent en parallèle : date de livraison = le plus long de (charge dev / devs) et (charge test / testeurs), en jours ouvrés à partir d'aujourd'hui.
- Les versions s'enchaînent : chacune inclut la charge des précédentes, donc ajouter du travail à la 4.17.2 décale la 4.18.0.

## Architecture

```
backend/    API Node.js (TypeScript, sans dépendance d'exécution)
frontend/   Application Angular (templates HTML et CSS séparés)
scripts/launcher/   Lanceur Windows en zone de notification (C#), compilé par la CI
```

```
backend/src/server.ts      point d'entrée (assemble config, clients, services)
backend/src/config.ts      lecture et validation des variables d'environnement, onglets activés
backend/src/models.ts      contrat de l'API (miroir : frontend/src/app/core/models.ts)
backend/src/clients/       clients HTTP GitLab et Jira
backend/src/services/      logique métier : git, jira, versions, pipelines
backend/src/http.ts        serveur HTTP (API + build du frontend)

frontend/src/app/core/       modèles, service API, état partagé (période, recherche)
frontend/src/app/shared/     composants et pipes réutilisables
frontend/src/app/features/   une page par onglet et ses composants
frontend/src/styles.css      styles globaux ; chaque composant a son .html et son .css
```

Le HTML est écrit uniquement dans des templates Angular (`*.html`) : aucun JavaScript ne construit de HTML.

Le package Windows est construit par `.github/workflows/release-windows.yml` (frontend + backend + `node.exe` portable + lanceur) et publié comme release `latest`.

## Licence

[MIT](LICENSE)
