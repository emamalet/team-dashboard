import { Component, input } from '@angular/core';
import { MergeRequest } from '../../core/models';
import { AgoPipe } from '../../shared/ago.pipe';
import { PipelineStatusPipe } from '../../shared/pipeline-status.pipe';
import { WhoComponent } from '../../shared/who.component';
import { MergeRequestStatusPipe } from './merge-request-status.pipe';

@Component({
  selector: 'app-merge-requests-table',
  imports: [AgoPipe, PipelineStatusPipe, WhoComponent, MergeRequestStatusPipe],
  templateUrl: './merge-requests-table.component.html',
})
export class MergeRequestsTableComponent {
  readonly mrs = input.required<MergeRequest[]>();
}
