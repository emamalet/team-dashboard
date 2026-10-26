import { Component, input } from '@angular/core';
import { ApiError } from '../core/api.service';

// Error of a failed API call; a tab that is not configured is shown as an information, not as a failure.
@Component({
  selector: 'app-load-error',
  templateUrl: './load-error.component.html',
  styleUrl: './load-error.component.css',
})
export class LoadErrorComponent {
  readonly error = input.required<Error>();

  protected isInfo(): boolean {
    const error = this.error();
    return error instanceof ApiError && error.notConfigured;
  }
}
