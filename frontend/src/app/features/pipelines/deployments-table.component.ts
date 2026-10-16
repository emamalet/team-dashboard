import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Deployment } from '../../core/models';
import { PipelineStatusPipe } from '../../shared/pipeline-status.pipe';
import { WhoComponent } from '../../shared/who.component';

@Component({
  selector: 'app-deployments-table',
  imports: [DatePipe, PipelineStatusPipe, WhoComponent],
  templateUrl: './deployments-table.component.html',
})
export class DeploymentsTableComponent {
  readonly deployments = input.required<Deployment[]>();
}
