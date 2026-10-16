import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'git' },
  { path: 'git', loadComponent: () => import('./features/git/git-page.component').then((m) => m.GitPageComponent) },
  { path: 'jira', loadComponent: () => import('./features/jira/jira-page.component').then((m) => m.JiraPageComponent) },
  {
    path: 'pipelines',
    loadComponent: () => import('./features/pipelines/pipelines-page.component').then((m) => m.PipelinesPageComponent),
  },
  { path: '**', redirectTo: 'git' },
];
