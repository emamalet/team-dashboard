import { Component, computed, input } from '@angular/core';
import { VersionedIssue } from '../../core/models';
import { AgoPipe } from '../../shared/ago.pipe';
import { WhoComponent } from '../../shared/who.component';

interface StatusGroup {
  status: string;
  issues: VersionedIssue[];
}

@Component({
  selector: 'app-versioned-issues-table',
  imports: [AgoPipe, WhoComponent],
  templateUrl: './versioned-issues-table.component.html',
})
export class VersionedIssuesTableComponent {
  readonly issues = input.required<VersionedIssue[]>();

  // Issues already arrive sorted by status: keep the order of appearance.
  protected readonly groups = computed(() => {
    const groups = new Map<string, VersionedIssue[]>();
    for (const issue of this.issues()) {
      groups.set(issue.status, [...(groups.get(issue.status) ?? []), issue]);
    }
    return [...groups].map(([status, issues]): StatusGroup => ({ status, issues }));
  });
}
