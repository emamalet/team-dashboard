import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { DashboardState } from '../../core/dashboard-state.service';
import { KpisComponent } from '../../shared/kpis.component';
import { LoadErrorComponent } from '../../shared/load-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { JiraUserCardComponent } from './jira-user-card.component';
import { VersionedIssuesTableComponent } from './versioned-issues-table.component';

@Component({
  selector: 'app-jira-page',
  imports: [KpisComponent, SkeletonComponent, LoadErrorComponent, VersionedIssuesTableComponent, JiraUserCardComponent],
  templateUrl: './jira-page.component.html',
})
export class JiraPageComponent {
  private readonly api = inject(ApiService);
  private readonly state = inject(DashboardState);

  protected readonly data = rxResource({
    params: () => ({ from: this.state.from(), to: this.state.to(), tick: this.state.refreshTick() }),
    stream: ({ params }) => this.api.jira(params.from, params.to),
  });

  protected readonly users = computed(() => {
    const query = this.state.query().toLowerCase();
    return (this.data.value()?.users ?? []).filter((u) => u.name.toLowerCase().includes(query));
  });

  protected readonly kpis = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return [
      { value: d.versioned.length, label: 'issues with version' },
      { value: d.users.length, label: 'active users' },
      { value: d.users.reduce((s, x) => s + x.comments, 0), label: 'comments' },
      { value: d.users.reduce((s, x) => s + x.transitions, 0), label: 'transitions' },
    ];
  });
}
