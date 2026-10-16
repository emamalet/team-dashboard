import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'ago' })
export class AgoPipe implements PipeTransform {
  transform(date: string | undefined): string {
    if (!date) return '';
    const minutes = Math.max(0, (Date.now() - Date.parse(date)) / 6e4);
    if (minutes < 60) return `il y a ${Math.round(minutes)} min`;
    if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`;
    return `il y a ${Math.round(minutes / 1440)} j`;
  }
}
