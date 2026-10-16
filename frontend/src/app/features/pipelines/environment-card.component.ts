import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { EnvironmentStatus } from '../../core/models';
import { AgoPipe } from '../../shared/ago.pipe';
import { AvatarComponent } from '../../shared/avatar.component';
import { PipelineStatusPipe } from '../../shared/pipeline-status.pipe';

@Component({
  selector: 'app-environment-card',
  imports: [DatePipe, AgoPipe, AvatarComponent, PipelineStatusPipe],
  templateUrl: './environment-card.component.html',
  styleUrl: './environment-card.component.css',
})
export class EnvironmentCardComponent {
  readonly environment = input.required<EnvironmentStatus>();

  protected readonly deployedToday = computed(() => {
    const latest = this.environment().latest;
    return !!latest && new Date(latest.date).toDateString() === new Date().toDateString();
  });
}
