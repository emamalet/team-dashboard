import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { PipelineFailure } from '../../core/models';
import { WhoComponent } from '../../shared/who.component';

@Component({
  selector: 'app-failures-table',
  imports: [DatePipe, WhoComponent],
  templateUrl: './failures-table.component.html',
  styleUrl: './failures-table.component.css',
})
export class FailuresTableComponent {
  readonly failures = input.required<PipelineFailure[]>();
  readonly branches = input.required<string[]>();
}
