import { Pipe, PipeTransform } from '@angular/core';
import { StatusLabel } from '../../shared/pipeline-status.pipe';
import { MergeRequest } from '../../core/models';

const MERGE_STATUS: Record<string, StatusLabel> = {
  mergeable: { cls: 'ok', text: 'Prete' },
  not_approved: { cls: 'wa', text: 'Approbation requise' },
  discussions_not_resolved: { cls: 'wa', text: 'Discussions ouvertes' },
  ci_must_pass: { cls: 'wa', text: 'CI en attente' },
  ci_still_running: { cls: 'wa', text: 'CI en attente' },
};

@Pipe({ name: 'mergeRequestStatus' })
export class MergeRequestStatusPipe implements PipeTransform {
  transform(mr: MergeRequest): StatusLabel {
    if (mr.draft) return { cls: '', text: 'Brouillon' };
    if (mr.conflicts) return { cls: 'ko', text: 'Conflits' };
    return MERGE_STATUS[mr.merge ?? ''] ?? { cls: '', text: mr.merge || '?' };
  }
}
