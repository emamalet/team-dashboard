import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.css',
})
export class AvatarComponent {
  readonly url = input<string | undefined>();
  readonly name = input<string | undefined>();
  readonly small = input(false);

  protected readonly failed = signal(false);
  protected readonly initials = computed(() =>
    (this.name() || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
  );
}
