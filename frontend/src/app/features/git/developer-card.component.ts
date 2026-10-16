import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Developer } from '../../core/models';
import { AgoPipe } from '../../shared/ago.pipe';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'app-developer-card',
  imports: [DatePipe, AgoPipe, AvatarComponent],
  templateUrl: './developer-card.component.html',
})
export class DeveloperCardComponent {
  readonly dev = input.required<Developer>();
}
