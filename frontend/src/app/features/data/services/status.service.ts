import { httpResource, HttpResourceRef } from '@angular/common/http';
import { computed, Signal } from '@angular/core';
import { Status } from '../../../interfaces/status';
import { environment } from '../../../../environments/environment.development';

export class StatusService {
   private readonly $status: HttpResourceRef<Status[]> = httpResource<Status[]>(() => `${environment.apiUrl}/status`, {
      defaultValue: [],
   });

   private readonly $buffer: Signal<{ [key: string]: Status }> = computed(() => {
      const status: Status[] = this.$status.value();
      const buffer: { [key: string]: Status } = {};

      for (let i: number = 0; i < status.length; i++) {
         buffer[status[i].slug] = status[i];
      }

      return buffer;
   });

   constructor() {}

   public get status(): Status[] {
      return this.$status.value();
   }

   public get buffer(): { [key: string]: Status } {
      return this.$buffer();
   }
}
