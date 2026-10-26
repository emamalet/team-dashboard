import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { DashboardState } from '../../core/dashboard-state.service';
import { LoadErrorComponent } from '../../shared/load-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { WhoComponent } from '../../shared/who.component';

@Component({
  selector: 'app-versions-page',
  imports: [DecimalPipe, SkeletonComponent, LoadErrorComponent, WhoComponent],
  templateUrl: './versions-page.component.html',
  styleUrl: './versions-page.component.css',
})
export class VersionsPageComponent {
  private readonly api = inject(ApiService);
  private readonly state = inject(DashboardState);

  protected readonly data = rxResource({
    params: () => ({ from: this.state.from(), to: this.state.to(), tick: this.state.refreshTick() }),
    stream: ({ params }) => this.api.versions(params.from, params.to),
  });

  private readonly selected = signal<string | null>(null);

  protected readonly version = computed(() => {
    const versions = this.data.value()?.versions ?? [];
    return versions.find((v) => v.name === this.selected()) ?? versions[0];
  });

  protected readonly unestimated = computed(() =>
    (this.version()?.issues ?? []).filter((i) => i.devDays === undefined || i.testDays === undefined),
  );

  protected select(name: string): void {
    this.selected.set(name);
  }

  protected formatDate(iso: string): string {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected isLate(delivery: string, releaseDate?: string): boolean {
    return !!releaseDate && delivery > releaseDate;
  }
}
