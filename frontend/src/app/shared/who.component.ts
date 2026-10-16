import { Component, input } from '@angular/core';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'app-who',
  imports: [AvatarComponent],
  templateUrl: './who.component.html',
})
export class WhoComponent {
  readonly name = input<string | undefined>();
  readonly avatar = input<string | undefined>();
}
