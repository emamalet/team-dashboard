import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'git' },
  { path: 'git', loadComponent: () => import('./features/git/git-page.component').then((m) => m.GitPageComponent) },
  { path: 'jira', loadComponent: () => import('./features/jira/jira-page.component').then((m) => m.JiraPageComponent) },
  {
    path: 'versions',
    loadComponent: () => import('./features/versions/versions-page.component').then((m) => m.VersionsPageComponent),
  },
  {
    path: 'pipelines',
    loadComponent: () => import('./features/pipelines/pipelines-page.component').then((m) => m.PipelinesPageComponent),
  },
  { path: 'settings', loadComponent: () => import('./features/settings/settings-page.component').then((m) => m.SettingsPageComponent) },
  { path: '**', redirectTo: 'git' },
];
