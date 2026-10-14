import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
   name: 'phoneFormat',
   standalone: true,
})
export class PhoneFormatPipe implements PipeTransform {
   private readonly ranges: {
      start: number;
      end: number;
   }[] = [
      { start: 0, end: 3 },
      { start: 3, end: 6 },
      { start: 6, end: 10 },
   ];

   public transform(value: string, divider?: string): string {
      if (typeof value !== 'string') return '';
      if (value.length !== 10) return value;

      const div: string = divider || ' ';

      return this.ranges.map(({ start, end }: (typeof this.ranges)[number]) => value.slice(start, end)).join(div);
   }
}
