import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { DashboardState } from '../../core/dashboard-state.service';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { DeploymentsTableComponent } from './deployments-table.component';
import { EnvironmentCardComponent } from './environment-card.component';
import { FailuresTableComponent } from './failures-table.component';

@Component({
  selector: 'app-pipelines-page',
  imports: [SkeletonComponent, EnvironmentCardComponent, FailuresTableComponent, DeploymentsTableComponent],
  templateUrl: './pipelines-page.component.html',
})
export class PipelinesPageComponent {
  private readonly api = inject(ApiService);
  private readonly state = inject(DashboardState);

  protected readonly data = rxResource({
    params: () => ({ from: this.state.from(), to: this.state.to(), tick: this.state.refreshTick() }),
    stream: ({ params }) => this.api.pipelines(params.from, params.to),
  });
}
