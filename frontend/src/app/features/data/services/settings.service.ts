import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpContext, httpResource, HttpResourceRef, HttpResourceRequest } from '@angular/common/http';
import { applyEach, disabled, form, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { EndpointData } from '../../../interfaces/api';
import { FormSchema } from '../../../interfaces/alias';
import {
   FieldsAgreements,
   FieldsExtras,
   FieldsRates,
   Setting,
   SettingConceptRow,
   SettingRateRow,
   SettingsForms,
   SettingsGroup,
   SettingsLoader,
   SettingsRoutes,
} from '../../../interfaces/settings';
import { API_CONTEXT, API_ROUTES, HTTP_METHODS } from '../repository/api.repository';
import {
   SETTINGS_AGREEMENTS,
   SETTINGS_EXTRAS,
   SETTINGS_BIWEEKLY_PERIODS,
   SETTINGS_MONTHLY_PERIODS,
   SETTINGS_WEEKLY_PERIODS,
} from '../repository/settings.repository';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { environment } from '../../../../environments/environment.development';
import {
   investorPercentageRules,
   monetaryRules,
   percentageRules,
   weeksRules,
} from '../../web/utilities/validators/numeric.validators';
import { SessionService } from './session.service';
import { DialogsService } from './dialogs.service';

type NumberField = number | null;

@Injectable({ providedIn: 'root' })
export class SettingsService {
   private readonly _http: HttpClient = inject(HttpClient);
   private readonly _session: SessionService = inject(SessionService);
   private readonly _dialogs: DialogsService = inject(DialogsService);

   private readonly routes: Record<SettingsRoutes, EndpointData> = {
      settings: { route: API_ROUTES.SETTINGS, method: HTTP_METHODS.GET },
      updateExtras: { route: API_ROUTES.UPDATEEXTRAS, method: HTTP_METHODS.PUT },
      updateAgreements: { route: API_ROUTES.UPDATEAGREEMENTS, method: HTTP_METHODS.PUT },
      updateMonthly: { route: API_ROUTES.UPDATEMONTHLY, method: HTTP_METHODS.PUT },
      updateBiweekly: { route: API_ROUTES.UPDATEBIWEEKLY, method: HTTP_METHODS.PUT },
      updateWeekly: { route: API_ROUTES.UPDATEWEEKLY, method: HTTP_METHODS.PUT },
   };

   private readonly $updating: WritableSignal<Record<SettingsGroup, boolean>> = signal({
      extras: false,
      agreements: false,
      monthly: false,
      biweekly: false,
      weekly: false,
   });

   private readonly $settings: HttpResourceRef<Setting[]> = httpResource<Setting[]>(
      (): HttpResourceRequest | undefined => {
         if (!this._session.token) return undefined;

         const { route, method } = this.routes.settings;
         const context: HttpContext = new HttpContext().set(API_CONTEXT.IGNORE_SUCCESS, true);

         return { url: `${environment.apiUrl}${route}`, method, context };
      },
      { defaultValue: [] },
   );

   private readonly $buffer: Signal<Record<string, Setting>> = computed(() => {
      const buffer: Record<string, Setting> = {};

      for (const setting of this.$settings.value()) buffer[setting.slug] = setting;

      return buffer;
   });

   private readonly $loader: Signal<SettingsLoader> = computed(() => ({
      settings: this.$settings.isLoading(),
      ...this.$updating(),
   }));

   private readonly $extras: Signal<SettingConceptRow[]> = computed(() => this.concepts(SETTINGS_EXTRAS));
   private readonly $agreements: Signal<SettingConceptRow[]> = computed(() => this.concepts(SETTINGS_AGREEMENTS));
   private readonly $monthly: Signal<SettingRateRow[]> = computed(() =>
      this.rates('monthly_loan', SETTINGS_MONTHLY_PERIODS),
   );
   private readonly $biweekly: Signal<SettingRateRow[]> = computed(() =>
      this.rates('biweekly_loan', SETTINGS_BIWEEKLY_PERIODS),
   );
   private readonly $weekly: Signal<SettingRateRow[]> = computed(() =>
      this.rates('weekly_loan', SETTINGS_WEEKLY_PERIODS),
   );

   private readonly $modelExtras: WritableSignal<FieldsExtras> = signal({ mora: null, visit: null });
   private readonly $modelAgreements: WritableSignal<FieldsAgreements> = signal({
      weekly: null,
      weeks_before: null,
      weeks_after: null,
   });
   private readonly $modelMonthly: WritableSignal<FieldsRates> = signal(this.emptyRates(SETTINGS_MONTHLY_PERIODS));
   private readonly $modelBiweekly: WritableSignal<FieldsRates> = signal(this.emptyRates(SETTINGS_BIWEEKLY_PERIODS));
   private readonly $modelWeekly: WritableSignal<FieldsRates> = signal(this.emptyRates(SETTINGS_WEEKLY_PERIODS));

   private readonly $formExtras: SettingsForms['extras'] = form(
      this.$modelExtras,
      (schema: FormSchema<FieldsExtras>) => {
         percentageRules(schema.mora);
         monetaryRules(schema.visit);

         disabled(schema.mora, { when: () => this.$updating().extras });
         disabled(schema.visit, { when: () => this.$updating().extras });
      },
   );

   private readonly $formAgreements: SettingsForms['agreements'] = form(
      this.$modelAgreements,
      (schema: FormSchema<FieldsAgreements>) => {
         percentageRules(schema.weekly);
         weeksRules(schema.weeks_before);
         weeksRules(schema.weeks_after);

         disabled(schema.weekly, { when: () => this.$updating().agreements });
         disabled(schema.weeks_before, { when: () => this.$updating().agreements });
         disabled(schema.weeks_after, { when: () => this.$updating().agreements });
      },
   );

   private readonly $formMonthly: SettingsForms['monthly'] = form(
      this.$modelMonthly,
      (schema: FormSchema<FieldsRates>) => this.ratesSchema(schema, 'monthly'),
   );

   private readonly $formBiweekly: SettingsForms['biweekly'] = form(
      this.$modelBiweekly,
      (schema: FormSchema<FieldsRates>) => this.ratesSchema(schema, 'biweekly'),
   );

   private readonly $formWeekly: SettingsForms['weekly'] = form(this.$modelWeekly, (schema: FormSchema<FieldsRates>) =>
      this.ratesSchema(schema, 'weekly'),
   );

   constructor() {}

   public get loader(): SettingsLoader {
      return this.$loader();
   }

   public get loaded(): boolean {
      return this.$settings.value().length > 0;
   }

   public get extras(): SettingConceptRow[] {
      return this.$extras();
   }

   public get agreements(): SettingConceptRow[] {
      return this.$agreements();
   }

   public get monthly(): SettingRateRow[] {
      return this.$monthly();
   }

   public get biweekly(): SettingRateRow[] {
      return this.$biweekly();
   }

   public get weekly(): SettingRateRow[] {
      return this.$weekly();
   }

   public get forms(): SettingsForms {
      return {
         extras: this.$formExtras,
         agreements: this.$formAgreements,
         monthly: this.$formMonthly,
         biweekly: this.$formBiweekly,
         weekly: this.$formWeekly,
      };
   }

   /**
    * Fetch settings again (only used when entering the module)
    */
   public reload(): void {
      this.$settings.reload();
   }

   /**
    * Fills one form with the current saved values & clears its state
    */
   public loadForm({ group }: { group: SettingsGroup }): void {
      const buffer: Record<string, Setting> = this.$buffer();
      const value = (slug: string): NumberField => buffer[slug]?.value ?? null;

      switch (group) {
         case 'extras':
            this.$formExtras().reset({ mora: value('mora'), visit: value('visit') });
            break;
         case 'agreements':
            this.$formAgreements().reset({
               weekly: value('agreement_weekly'),
               weeks_before: value('agreement_weeks_before'),
               weeks_after: value('agreement_weeks_after'),
            });
            break;
         case 'monthly':
            this.$formMonthly().reset(this.ratesValues('monthly_loan', SETTINGS_MONTHLY_PERIODS));
            break;
         case 'biweekly':
            this.$formBiweekly().reset(this.ratesValues('biweekly_loan', SETTINGS_BIWEEKLY_PERIODS));
            break;
         case 'weekly':
            this.$formWeekly().reset(this.ratesValues('weekly_loan', SETTINGS_WEEKLY_PERIODS));
            break;
      }
   }

   /**
    *
    */
   public updateExtras(): void {
      this.update({
         group: 'extras',
         route: 'updateExtras',
         form: this.$formExtras,
         body: () => ({ ...this.$formExtras().value() }),
      });
   }

   /**
    *
    */
   public updateAgreements(): void {
      this.update({
         group: 'agreements',
         route: 'updateAgreements',
         form: this.$formAgreements,
         body: () => ({ ...this.$formAgreements().value() }),
      });
   }

   /**
    *
    */
   public updateMonthly(): void {
      this.update({
         group: 'monthly',
         route: 'updateMonthly',
         form: this.$formMonthly,
         body: () => ({ ...this.$formMonthly().value() }),
      });
   }

   /**
    *
    */
   public updateBiweekly(): void {
      this.update({
         group: 'biweekly',
         route: 'updateBiweekly',
         form: this.$formBiweekly,
         body: () => ({ ...this.$formBiweekly().value() }),
      });
   }

   /**
    *
    */
   public updateWeekly(): void {
      this.update({
         group: 'weekly',
         route: 'updateWeekly',
         form: this.$formWeekly,
         body: () => ({ ...this.$formWeekly().value() }),
      });
   }

   /**
    * Confirms, validates & sends one group. Saved values come in the
    * response, so they're stored locally without fetching again.
    */
   private update({
      group,
      route,
      form,
      body,
   }: {
      group: SettingsGroup;
      route: SettingsRoutes;
      form: SettingsForms[SettingsGroup];
      body: () => object;
   }): void {
      const { method, route: path } = this.routes[route];

      submit(form as SettingsForms['extras'], async () => {
         try {
            await this._dialogs.confirmation({ message: DIALOG_I18N_KEYS.CONFIRM_UPDATE_SETTINGS });
         } catch {
            return;
         }

         this.setUpdating({ group, value: true });

         try {
            const saved: Setting[] = await firstValueFrom(
               this._http.request<Setting[]>(method, `${environment.apiUrl}${path}`, { body: body() }),
            );

            this.merge({ saved });
            this._dialogs.closeDialogs();
         } catch {
            // the error interceptor already notifies the user
         } finally {
            this.setUpdating({ group, value: false });
         }
      }).then((state: boolean) => {
         if (state) return;

         this._dialogs.alert({
            severity: 'error',
            title: FORMS_I18N_KEYS.ERROR_TITLE,
            text: FORMS_I18N_KEYS.VAL_COMPLETE_CORRECTLY,
         });
      });
   }

   /**
    * Replaces saved settings in the local list (no extra request)
    */
   private merge({ saved }: { saved: Setting[] }): void {
      const bySlug: Record<string, Setting> = {};

      for (const setting of saved) bySlug[setting.slug] = setting;

      const current: Setting[] = this.$settings.value();
      const merged: Setting[] = current.map((setting: Setting) => bySlug[setting.slug] ?? setting);

      for (const setting of saved)
         if (!current.some((item: Setting) => item.slug === setting.slug)) merged.push(setting);

      this.$settings.set(merged);
   }

   /**
    *
    */
   private setUpdating({ group, value }: { group: SettingsGroup; value: boolean }): void {
      this.$updating.update((prev: Record<SettingsGroup, boolean>) => ({ ...prev, [group]: value }));
   }

   /**
    *
    */
   private concepts(items: { slug: string; concept: string }[]): SettingConceptRow[] {
      const buffer: Record<string, Setting> = this.$buffer();

      return items.map(({ slug, concept }) => ({ concept, setting: buffer[slug] ?? null }));
   }

   /**
    *
    */
   private rates(prefix: string, periods: number): SettingRateRow[] {
      const buffer: Record<string, Setting> = this.$buffer();

      return Array.from({ length: periods }, (_, index: number) => ({
         period: index + 1,
         investor: buffer[`${prefix}_investor_${index + 1}`] ?? null,
         general: buffer[`${prefix}_rate_${index + 1}`] ?? null,
      }));
   }

   /**
    *
    */
   private ratesValues(prefix: string, periods: number): FieldsRates {
      return {
         investor: this.rates(prefix, periods).map((row: SettingRateRow) => row.investor?.value ?? null),
         general: this.rates(prefix, periods).map((row: SettingRateRow) => row.general?.value ?? null),
      };
   }

   /**
    *
    */
   private emptyRates(periods: number): FieldsRates {
      return {
         investor: Array.from({ length: periods }, () => null),
         general: Array.from({ length: periods }, () => null),
      };
   }

   /**
    * Rules for the lists of investor/general percentages
    */
   private ratesSchema(schema: FormSchema<FieldsRates>, group: 'monthly' | 'biweekly' | 'weekly'): void {
      // the investor receives part of its share of every payment, so it can't be more than all of it
      applyEach(schema.investor, (item) => {
         investorPercentageRules(item);
         disabled(item, { when: () => this.$updating()[group] });
      });

      applyEach(schema.general, (item) => {
         percentageRules(item);
         disabled(item, { when: () => this.$updating()[group] });
      });
   }
}
