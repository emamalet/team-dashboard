import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { GitData, JiraData, PipelineData, VersionsData } from './models';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly notConfigured: boolean,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<unknown>>();

  git(from: string, to: string): Observable<GitData> {
    return this.fetch<GitData>('git', from, to);
  }

  jira(from: string, to: string): Observable<JiraData> {
    return this.fetch<JiraData>('jira', from, to);
  }

  versions(from: string, to: string): Observable<VersionsData> {
    return this.fetch<VersionsData>('versions', from, to);
  }

  pipelines(from: string, to: string): Observable<PipelineData> {
    return this.fetch<PipelineData>('pipelines', from, to);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private fetch<T>(endpoint: string, from: string, to: string): Observable<T> {
    const key = `${endpoint}|${from}|${to}`;
    if (!this.cache.has(key)) {
      const request = this.http.get<T>(`/api/${endpoint}`, { params: { from, to } }).pipe(
        shareReplay(1),
        catchError((e: HttpErrorResponse) => {
          this.cache.delete(key);
          return throwError(() => new ApiError(e.error?.error ?? e.message, e.error?.notConfigured === true));
        }),
      );
      this.cache.set(key, request);
    }
    return this.cache.get(key) as Observable<T>;
  }
}
