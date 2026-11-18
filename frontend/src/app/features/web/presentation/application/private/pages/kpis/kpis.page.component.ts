import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, Signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Kpis } from '../../../../../../../interfaces/kpis';
import { KPIS_CARDS, KPIS_I18N_KEYS, KPIS_REFRESH_MS } from '../../../../../../data/repository/kpis.repository';
import { KpisService } from '../../../../../../data/services/kpis.service';
import { KpiLoansChartComponent } from './components/kpi-loans-chart.component';

/**
 * Kpis of the business: the money lent, what is waiting to be paid, the investors & the borrowers, & the
 * line chart of the loans made on every week. The values are read again every minute while it is open.
 */
@Component({
   selector: 'fi-kpis-page-component',
   imports: [CurrencyPipe, DatePipe, DecimalPipe, TranslatePipe, KpiLoansChartComponent],
   host: { class: 'flex min-w-0 flex-col gap-2' },
   template: `
      @let kpis = $kpis();

      @if (kpis) {
         <section
            class="grid w-full grid-cols-1 gap-2 min-[560px]:grid-cols-2 xl:grid-cols-5"
            aria-label="KPIs"
         >
            @for (card of CARDS; track card.id) {
               <article class="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-500 p-3 sm:gap-4 sm:p-4">
                  <span
                     class="flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12"
                     [class]="card.accent"
                  >
                     <i [class]="'bx text-2xl sm:text-3xl ' + card.icon"></i>
                  </span>

                  <div class="flex min-w-0 flex-col">
                     <span class="text-sm text-slate-600">{{ card.label | translate }}</span>
                     <span class="text-second text-2xl leading-tight font-bold wrap-anywhere sm:text-3xl">
                        @if (card.type === 'money') {
                           {{ kpis[card.id] | currency }}
                        } @else if (card.type === 'percentage') {
                           {{ kpis[card.id] | number: '1.0-2' }}%
                        } @else {
                           {{ kpis[card.id] | number }}
                        }
                     </span>
                  </div>
               </article>
            }
         </section>

         <section class="flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-slate-500 p-3 sm:p-5">
            <header class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
               <div class="flex flex-col">
                  <h2 class="text-second text-lg font-medium">{{ I18N.CHART_TITLE | translate }}</h2>
                  <span class="text-xs text-slate-500">{{ I18N.CHART_SUBTITLE | translate }}</span>
               </div>
               <span class="text-xs text-slate-500">
                  {{ I18N.UPDATED | translate: { date: (kpis.updated_at | date: 'dd.MM.yyyy HH:mm') } }}
               </span>
            </header>

            <fi-kpi-loans-chart-component [weeks]="kpis.weeks" />
         </section>
      } @else if ($failed()) {
         <section class="flex w-full flex-col items-center gap-3 rounded-2xl border border-slate-500 p-6 text-center">
            <i class="bx bx-error-circle text-main text-4xl"></i>
            <p class="text-second">{{ I18N.ERROR | translate }}</p>
            <button
               class="bg-second hover:bg-second-light focus:bg-second-light cursor-pointer rounded-lg px-5 py-2 text-white transition-all"
               type="button"
               (click)="handleRetry()"
            >
               {{ I18N.RETRY | translate }}
            </button>
         </section>
      } @else {
         <section class="grid w-full animate-pulse grid-cols-1 gap-2 min-[560px]:grid-cols-2 xl:grid-cols-5">
            @for (card of CARDS; track card.id) {
               <div class="h-20 w-full rounded-2xl bg-slate-300 sm:h-24"></div>
            }
         </section>
         <div class="h-72 w-full animate-pulse rounded-2xl bg-slate-300 sm:h-96"></div>
      }
   `,
})
export class KpisPageComponent {
   private readonly _kpis: KpisService = inject(KpisService);
   private readonly _destroy: DestroyRef = inject(DestroyRef);

   public readonly I18N = KPIS_I18N_KEYS;
   public readonly CARDS = KPIS_CARDS;

   public readonly $kpis: Signal<Kpis | undefined> = computed(() => this._kpis.kpis);
   public readonly $failed: Signal<boolean> = computed(() => this._kpis.failed);

   constructor() {
      // asked again every time the panel is entered & while it stays open, the api keeps them up to date
      this._kpis.enter();

      const timer: ReturnType<typeof setInterval> = setInterval(() => this._kpis.enter(), KPIS_REFRESH_MS);

      this._destroy.onDestroy(() => clearInterval(timer));
   }

   public handleRetry(): void {
      this._kpis.enter();
   }
}
