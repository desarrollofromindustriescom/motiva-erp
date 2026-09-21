import { CommonModule } from '@angular/common';
import { Component, computed, effect, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { TableModule } from 'primeng/table';

@Component({
   selector: 'fi-settings',
   imports: [CommonModule, TableModule],
   template: `
      @let loading = $loading();

      @if (!loading) {
         <div class="w-full flex flex-col p-4 gap-10">
            <div class="flex items-center justify-between w-full rounded-xl bg-second p-2 h-20">
               <h1 class="font-medium text-2xl text-white">Configuración</h1>
               <div class="bg-white rounded-lg p-1 flex items-center justify-center h-full">
                  <img
                     src="/assets/icons/logo.svg"
                     alt=""
                     class="h-full"
                  />
               </div>
            </div>

            <div class="w-full flex p-4 rounded-xl flex-col border border-second">
               <h2 class="text-lg text-second">Extras</h2>
               <p-table
                  [value]="[{}]"
                  class="w-full"
               >
                  <ng-template #header>
                     <tr>
                        <th>Concepto</th>
                        <th>
                           <div class="flex w-full justify-end">Valor</div>
                        </th>
                     </tr>
                  </ng-template>
                  <ng-template
                     #body
                     let-product
                  >
                     <tr>
                        <td>{{ 'Porcentaje de MORA' }}</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ $extra().mora.value }}%</div>
                        </td>
                     </tr>
                     <tr>
                        <td>{{ 'Costo por visita' }}</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">
                              {{ $extra().visit.value | currency }}
                           </div>
                        </td>
                     </tr>
                  </ng-template>
               </p-table>
            </div>

            <div class="w-full flex p-4 rounded-xl flex-col border border-second">
               <h2 class="text-lg text-second">Convenios</h2>
               <p-table
                  [value]="[{}]"
                  class="w-full"
               >
                  <ng-template #header>
                     <tr>
                        <th>Concepto</th>
                        <th>
                           <div class="flex w-full justify-end">Valor</div>
                        </th>
                     </tr>
                  </ng-template>
                  <ng-template
                     #body
                     let-product
                  >
                     <tr>
                        <td>{{ 'Porcentaje de convenios' }}</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ $agreement().agreement.value }}%</div>
                        </td>
                     </tr>
                     <tr>
                        <td>{{ 'Semanas de tolerancia antes de convenio' }}</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ $agreement().weekBefore.value }} semanas</div>
                        </td>
                     </tr>
                     <tr>
                        <td>{{ 'Semanas de tolerancia en convenio' }}</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ $agreement().weekAfter.value }} semanas</div>
                        </td>
                     </tr>
                  </ng-template>
               </p-table>
            </div>

            <div class="w-full flex p-4 rounded-xl flex-col border border-second">
               <h2 class="text-lg text-second">Porcentajes de interés para prestamos mensuales</h2>
               <p-table
                  [value]="$monthly()"
                  class="w-full"
               >
                  <ng-template #header>
                     <tr>
                        <th>Periodo</th>
                        <th>
                           <div class="flex w-full justify-end">Inversor</div>
                        </th>
                        <th>
                           <div class="flex w-full justify-end">Valor</div>
                        </th>
                     </tr>
                  </ng-template>
                  <ng-template
                     #body
                     let-product
                     let-i="rowIndex"
                  >
                     <tr>
                        <td>{{ i + 1 }} Meses</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ product.investor.value }}%</div>
                        </td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ product.general.value }}%</div>
                        </td>
                     </tr>
                  </ng-template>
               </p-table>
            </div>

            <div class="w-full flex p-4 rounded-xl flex-col border border-second">
               <h2 class="text-lg text-second">Porcentajes de interés para prestamos semanales</h2>
               <p-table
                  [value]="$weekly()"
                  class="w-full"
               >
                  <ng-template #header>
                     <tr>
                        <th>Periodo</th>
                        <th>
                           <div class="flex w-full justify-end">Inversor</div>
                        </th>
                        <th>
                           <div class="flex w-full justify-end">Valor</div>
                        </th>
                     </tr>
                  </ng-template>
                  <ng-template
                     #body
                     let-product
                     let-i="rowIndex"
                  >
                     <tr>
                        <td>{{ i + 1 }} Semanas</td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ product.investor.value }}%</div>
                        </td>
                        <td class="w-fit text-right">
                           <div class="flex w-full justify-end">{{ product.general.value }}%</div>
                        </td>
                     </tr>
                  </ng-template>
               </p-table>
            </div>
         </div>
      } @else {
         <p>Cargando...</p>
      }
   `,
})
export class Settings {
   private readonly $settings: WritableSignal<
      {
         slug: string;
         value: number;
         unit: string;
      }[]
   > = signal([]);

   public readonly $extra: Signal<{
      mora: {
         slug: string;
         value: number;
         unit: string;
      };
      visit: {
         slug: string;
         value: number;
         unit: string;
      };
   }> = computed(() => {
      const settings = this.$settings();
      let mora: any = {};
      let visit: any = {};

      for (let i = 0; i < settings.length; i++) {
         if (settings[i].slug === 'mora') {
            mora = settings[i];
         }
         if (settings[i].slug === 'visit') {
            visit = settings[i];
         }

         if (mora.slug && visit.slug) {
            break;
         }
      }

      return {
         mora,
         visit,
      };
   });

   public readonly $agreement: Signal<{
      agreement: {
         slug: string;
         value: number;
         unit: string;
      };
      weekBefore: {
         slug: string;
         value: number;
         unit: string;
      };
      weekAfter: {
         slug: string;
         value: number;
         unit: string;
      };
   }> = computed(() => {
      const settings = this.$settings();
      let agreement: any = {};
      let weekBefore: any = {};
      let weekAfter: any = {};

      for (let i = 0; i < settings.length; i++) {
         if (settings[i].slug === 'agreement_weekly') {
            agreement = settings[i];
         }

         if (settings[i].slug === 'agreement_weeks_before') {
            weekBefore = settings[i];
         }

         if (settings[i].slug === 'agreement_weeks_after') {
            weekAfter = settings[i];
         }

         if (agreement.slug && weekBefore.slug && weekAfter.slug) {
            break;
         }
      }

      return {
         agreement,
         weekBefore,
         weekAfter,
      };
   });

   public readonly $monthly: Signal<
      {
         investor: {
            slug: string;
            value: number;
            unit: string;
         };
         general: {
            slug: string;
            value: number;
            unit: string;
         };
      }[]
   > = computed(() => {
      const settings = this.$settings();
      let total = settings.filter((setting) => setting.slug.includes('monthly_loan_'));
      let length = total.length / 2;
      let data: any = [];

      for (let i = 0; i < length; i++) {
         let investor = settings.filter((setting) => setting.slug.includes(`monthly_loan_investor_${i + 1}`))[0];
         let general = settings.filter((setting) => setting.slug.includes(`monthly_loan_rate_${i + 1}`))[0];

         data = [
            ...data,
            {
               investor,
               general,
            },
         ];
      }

      return data;
   });

   public readonly $weekly: Signal<
      {
         investor: {
            slug: string;
            value: number;
            unit: string;
         };
         general: {
            slug: string;
            value: number;
            unit: string;
         };
      }[]
   > = computed(() => {
      const settings = this.$settings();
      let total = settings.filter((setting) => setting.slug.includes('weekly_loan_'));
      let length = total.length / 2;
      let data: any = [];

      for (let i = 0; i < length; i++) {
         let investor = settings.filter((setting) => setting.slug.includes(`weekly_loan_investor_${i + 1}`))[0];
         let general = settings.filter((setting) => setting.slug.includes(`weekly_loan_rate_${i + 1}`))[0];

         data = [
            ...data,
            {
               investor,
               general,
            },
         ];
      }

      return data;
   });

   public readonly $loading: WritableSignal<boolean> = signal(false);

   constructor() {
      effect(() => {
         untracked(() => {
            this.$loading.set(true);
         });
         cookieStore
            .get({
               name: 'token',
            })
            .then((data) => {
               if (data && data.value) {
                  fetch('https://motiva-erp.onrender.com/api/settings', {
                     method: 'GET',
                     headers: {
                        'Authorization': data.value,
                        'Content-type': 'application/json',
                        'Accept': 'application/json',
                     },
                  })
                     .then((res) => res.json())
                     .then((res) => {
                        console.log(res);
                        if (res.success && res.data && res.data.settings) {
                           this.$settings.set(res.data.settings);
                        }
                     })
                     .finally(() => {
                        untracked(() => {
                           this.$loading.set(false);
                        });
                     });
               }
            })
            .finally(() => {
               untracked(() => {
                  this.$loading.set(false);
               });
            });
      });
   }
}
