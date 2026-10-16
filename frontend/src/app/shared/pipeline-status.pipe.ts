import { Pipe, PipeTransform } from '@angular/core';

export interface StatusLabel {
  cls: string;
  text: string;
}

const KNOWN: Record<string, StatusLabel> = {
  success: { cls: 'ok', text: 'Succes' },
  failed: { cls: 'ko', text: 'Echec' },
  running: { cls: 'wa', text: 'En cours' },
  canceled: { cls: 'wa', text: 'Annule' },
};

// CSS class and label for a GitLab pipeline status.
@Pipe({ name: 'pipelineStatus' })
export class PipelineStatusPipe implements PipeTransform {
  transform(status: string): StatusLabel {
    return KNOWN[status] ?? { cls: 'wa', text: status };
  }
}
