import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { DashboardState } from '../../core/dashboard-state.service';
import { KpisComponent } from '../../shared/kpis.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { DeveloperCardComponent } from './developer-card.component';
import { MergeRequestsTableComponent } from './merge-requests-table.component';

@Component({
  selector: 'app-git-page',
  imports: [KpisComponent, SkeletonComponent, MergeRequestsTableComponent, DeveloperCardComponent],
  templateUrl: './git-page.component.html',
})
export class GitPageComponent {
  private readonly api = inject(ApiService);
  private readonly state = inject(DashboardState);

  protected readonly data = rxResource({
    params: () => ({ from: this.state.from(), to: this.state.to(), tick: this.state.refreshTick() }),
    stream: ({ params }) => this.api.git(params.from, params.to),
  });

  protected readonly devs = computed(() => {
    const query = this.state.query().toLowerCase();
    return (this.data.value()?.devs ?? []).filter((d) => (d.name + d.username).toLowerCase().includes(query));
  });

  protected readonly kpis = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return [
      { value: d.mrs.length, label: 'open MRs' },
      { value: d.devs.length, label: 'contributors' },
      { value: d.devs.reduce((s, x) => s + x.pushes, 0), label: 'pushes' },
      { value: d.devs.reduce((s, x) => s + x.commits, 0), label: 'commits (push heads)' },
    ];
  });
}
