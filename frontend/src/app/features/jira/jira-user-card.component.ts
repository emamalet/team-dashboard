import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { JiraUser } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'app-jira-user-card',
  imports: [DatePipe, AvatarComponent],
  templateUrl: './jira-user-card.component.html',
  styleUrl: './jira-user-card.component.css',
})
export class JiraUserCardComponent {
  readonly user = input.required<JiraUser>();
}
