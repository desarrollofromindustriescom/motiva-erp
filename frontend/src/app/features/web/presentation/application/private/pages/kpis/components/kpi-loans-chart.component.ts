import {
   afterNextRender,
   Component,
   DestroyRef,
   effect,
   ElementRef,
   inject,
   input,
   InputSignal,
   viewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { KpiWeek } from '../../../../../../../../interfaces/kpis';
import { KPIS_I18N_KEYS } from '../../../../../../../data/repository/kpis.repository';

// only what the chart needs is registered, so the bundle of the page stays small
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const COLOR_MAIN: string = '#f27732';
const COLOR_SECOND: string = '#0e2953';
const COLOR_GRID: string = '#e2e8f0';
const COLOR_TEXT: string = '#475569';
const FONT: string = 'Inter, sans-serif';

// under this width (px) the chart uses smaller texts, fewer labels & less margins
const COMPACT_WIDTH: number = 520;

/**
 * Line chart of the loans made on every week (the number of loans, with the money they lent in the tooltip).
 * It is drawn in a box that follows its container: when the width changes the chart is resized & redrawn
 * with the layout of the size (the phone one is compact & its tooltip stays inside the chart).
 */
@Component({
   selector: 'fi-kpi-loans-chart-component',
   template: `
      <div
         #chart
         class="h-60 w-full min-w-0 sm:h-72 lg:h-80"
         role="img"
         [attr.aria-label]="label"
      ></div>
   `,
   host: { class: 'block w-full min-w-0' },
})
export class KpiLoansChartComponent {
   private readonly _translate: TranslateService = inject(TranslateService);
   private readonly _destroy: DestroyRef = inject(DestroyRef);

   private readonly $container = viewChild.required<ElementRef<HTMLDivElement>>('chart');

   private chart: echarts.ECharts | null = null;

   public readonly $weeks: InputSignal<KpiWeek[]> = input.required<KpiWeek[]>({ alias: 'weeks' });

   public readonly label: string = this._translate.instant(KPIS_I18N_KEYS.CHART_LABEL);

   constructor() {
      afterNextRender(() => {
         const element: HTMLDivElement = this.$container().nativeElement;

         this.chart = echarts.init(element, undefined, { renderer: 'canvas' });
         this.draw();

         // the chart follows its box: a resize of the window, the menu, the phone turning...
         const observer: ResizeObserver = new ResizeObserver(() => {
            this.chart?.resize();
            this.draw();
         });

         observer.observe(element);

         this._destroy.onDestroy(() => {
            observer.disconnect();
            this.chart?.dispose();
            this.chart = null;
         });
      });

      // the chart is drawn again when the weeks change
      effect(() => {
         this.$weeks();
         this.draw();
      });
   }

   private draw(): void {
      if (!this.chart) return;

      const compact: boolean = this.$container().nativeElement.clientWidth < COMPACT_WIDTH;

      this.chart.setOption(this.option({ weeks: this.$weeks(), compact }), true);
   }

   private option({ weeks, compact }: { weeks: KpiWeek[]; compact: boolean }): EChartsCoreOption {
      const locale: string = 'es-MX';
      const day: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
      const long: Intl.DateTimeFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
      const money: Intl.NumberFormat = new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' });
      // the week starts on a Monday, the date has no time so it is read as local to not move a day
      const date = (start: string): Date => new Date(`${start}T00:00:00`);

      const loansLabel: string = this._translate.instant(KPIS_I18N_KEYS.CHART_LOANS);
      const amountLabel: string = this._translate.instant(KPIS_I18N_KEYS.CHART_AMOUNT);
      const size: number = compact ? 11 : 12;

      return {
         animationDuration: 500,
         textStyle: { fontFamily: FONT },
         grid: {
            top: compact ? 16 : 24,
            right: compact ? 14 : 24,
            bottom: compact ? 8 : 12,
            left: compact ? 8 : 16,
            containLabel: true,
         },
         tooltip: {
            trigger: 'axis',
            // inside the chart, so it is never cut by the screen of a phone
            confine: true,
            borderColor: COLOR_GRID,
            backgroundColor: '#ffffff',
            padding: compact ? 8 : 10,
            textStyle: { color: COLOR_SECOND, fontFamily: FONT, fontSize: size },
            axisPointer: { type: 'line', lineStyle: { color: COLOR_MAIN, type: 'dashed' } },
            formatter: (params: unknown): string => {
               const [point] = params as { dataIndex: number }[];
               const week: KpiWeek = weeks[point.dataIndex];

               return [
                  `<div style="font-weight:600;margin-bottom:4px">${this._translate.instant(KPIS_I18N_KEYS.CHART_WEEK_OF, { date: long.format(date(week.week_start)) })}</div>`,
                  `<div>${loansLabel}: <b>${week.loans}</b></div>`,
                  `<div>${amountLabel}: <b>${money.format(week.amount)}</b></div>`,
               ].join('');
            },
         },
         xAxis: {
            type: 'category',
            boundaryGap: false,
            data: weeks.map((week: KpiWeek) => day.format(date(week.week_start)).replace('.', '')),
            axisLine: { lineStyle: { color: COLOR_GRID } },
            axisTick: { show: false },
            axisLabel: {
               color: COLOR_TEXT,
               fontSize: size,
               // on a phone only some weeks have a label, the rest are still in the line & the tooltip
               interval: compact ? 1 : 0,
               hideOverlap: true,
               margin: 10,
            },
         },
         yAxis: {
            type: 'value',
            // the loans are counted, so no decimals
            minInterval: 1,
            min: 0,
            axisLabel: { color: COLOR_TEXT, fontSize: size },
            splitLine: { lineStyle: { color: COLOR_GRID, type: 'dashed' } },
         },
         series: [
            {
               name: loansLabel,
               type: 'line',
               smooth: 0.25,
               data: weeks.map((week: KpiWeek) => week.loans),
               symbol: 'circle',
               symbolSize: compact ? 6 : 8,
               showSymbol: true,
               lineStyle: { width: compact ? 2.5 : 3, color: COLOR_MAIN },
               itemStyle: { color: COLOR_MAIN, borderColor: '#ffffff', borderWidth: 2 },
               areaStyle: {
                  color: {
                     type: 'linear',
                     x: 0,
                     y: 0,
                     x2: 0,
                     y2: 1,
                     colorStops: [
                        { offset: 0, color: 'rgba(242, 119, 50, 0.35)' },
                        { offset: 1, color: 'rgba(242, 119, 50, 0.02)' },
                     ],
                  },
               },
               emphasis: { focus: 'series', scale: 1.3 },
            },
         ],
      };
   }
}
