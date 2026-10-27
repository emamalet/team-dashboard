import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/api.service';
import { DashboardState } from '../../core/dashboard-state.service';
import { SettingItem } from '../../core/models';
import { LoadErrorComponent } from '../../shared/load-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';

// Edits backend/.env from the interface; only the modified fields are sent.
@Component({
  selector: 'app-settings-page',
  imports: [LoadErrorComponent, SkeletonComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {
  private readonly api = inject(ApiService);
  private readonly state = inject(DashboardState);

  protected readonly data = rxResource({ stream: () => this.api.getSettings() });
  protected readonly edited = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  protected readonly saved = signal<'' | 'ok' | 'port'>('');

  protected readonly groups = computed(() => {
    const groups = new Map<string, SettingItem[]>();
    for (const s of this.data.value()?.settings ?? []) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
    return [...groups].map(([title, settings]) => ({ title, settings }));
  });

  protected readonly dirty = computed(() => Object.keys(this.edited()).length > 0);

  protected valueOf(s: SettingItem): string {
    return this.edited()[s.name] ?? s.value;
  }

  protected placeholder(s: SettingItem): string {
    if (s.secret) return s.isSet ? '(inchange : saisir pour remplacer)' : '';
    return s.example ? `ex : ${s.example}` : '';
  }

  protected edit(s: SettingItem, value: string): void {
    this.saved.set('');
    this.edited.update((e) => {
      const next = { ...e };
      // Back to the stored value (an empty secret means "unchanged"): nothing to save for this field.
      if (value === s.value) delete next[s.name];
      else next[s.name] = value;
      return next;
    });
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set('');
    this.api.saveSettings(this.edited()).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.saved.set(result.portChanged ? 'port' : 'ok');
        this.edited.set({});
        this.data.reload();
        this.state.refresh();
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.saveError.set(e.message);
      },
    });
  }
}
