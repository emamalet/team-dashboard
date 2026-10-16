import { Component, input } from '@angular/core';

export interface Kpi {
  value: number;
  label: string;
}

@Component({
  selector: 'app-kpis',
  templateUrl: './kpis.component.html',
})
export class KpisComponent {
  readonly items = input.required<Kpi[]>();
}
