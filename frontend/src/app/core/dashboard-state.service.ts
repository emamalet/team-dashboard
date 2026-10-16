import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

const DAY_MS = 864e5;
const toIsoDay = (d: Date): string => d.toISOString().slice(0, 10);

// State shared between the header (period, search) and the pages.
@Injectable({ providedIn: 'root' })
export class DashboardState {
  private readonly api = inject(ApiService);

  readonly from = signal('');
  readonly to = signal('');
  readonly presetDays = signal<number | null>(null);
  readonly query = signal('');
  readonly refreshTick = signal(0);

  constructor() {
    this.applyPreset(7);
  }

  applyPreset(days: number): void {
    this.to.set(toIsoDay(new Date()));
    this.from.set(toIsoDay(new Date(Date.now() - (days - 1) * DAY_MS)));
    this.presetDays.set(days);
  }

  setFrom(value: string): void {
    this.from.set(value);
    this.presetDays.set(null);
  }

  setTo(value: string): void {
    this.to.set(value);
    this.presetDays.set(null);
  }

  refresh(): void {
    this.api.clearCache();
    this.refreshTick.update((n) => n + 1);
  }
}
