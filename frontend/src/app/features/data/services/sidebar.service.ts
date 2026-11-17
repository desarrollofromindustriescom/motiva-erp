import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApplicationModule } from '../../../interfaces/navigation';
import {
   SidebarFilterValues,
   SidebarOption,
   SidebarFiltersEvent,
   SidebarSection,
   SidebarSections,
   SidebarSelection,
} from '../../../interfaces/sidebar';
import { APPLICATION_MODULES } from '../repository/navigation.repository';
import {
   SIDEBAR_FIELDS,
   SIDEBAR_LOAN_FIELDS,
   SIDEBAR_OPTIONS,
   SIDEBAR_SECTIONS,
} from '../repository/sidebar.repository';
import { LOANS_I18N_KEYS } from '../repository/loans.repository';
import { USERS_I18N_KEYS } from '../repository/users.repository';
import { NavigationService } from './navigation.service';

const LOANS_PROFILES = { superadmin: true, administrator: true, manager: true };

// options that are only numbers or names, so the same for every profile
const option = (id: string, label: string): SidebarOption => ({ id, label, allowed: LOANS_PROFILES });
const numbers = (from: number, to: number): SidebarOption[] =>
   Array.from({ length: to - from + 1 }, (_: unknown, index: number) => option(`${from + index}`, `${from + index}`));

/**
 * Centralized definition of the extra sections (actions, filters...) each module shows on the sidebar
 */
@Injectable({ providedIn: 'root' })
export class SidebarService {
   private readonly _navigation: NavigationService = inject(NavigationService);
   private readonly _selection: Subject<SidebarSelection> = new Subject();

   private readonly _filters: Subject<SidebarFiltersEvent> = new Subject();
   private readonly $values: WritableSignal<Record<string, SidebarFilterValues>> = signal({});

   public readonly selection$: Observable<SidebarSelection> = this._selection.asObservable();
   public readonly filters$: Observable<SidebarFiltersEvent> = this._filters.asObservable();

   public readonly sections: SidebarSections = {
      [APPLICATION_MODULES.LOANS]: [
         {
            id: SIDEBAR_SECTIONS.LOANS_ACTIONS,
            title: LOANS_I18N_KEYS.ACTIONS_TITLE,
            type: 'actions',
            options: [
               {
                  id: SIDEBAR_OPTIONS.LOANS_NEW_LOAN,
                  label: LOANS_I18N_KEYS.ACTION_NEW_LOAN,
                  icon: 'bx-grid-circle-plus',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
               {
                  id: SIDEBAR_OPTIONS.LOANS_NEW_AGREEMENT,
                  label: LOANS_I18N_KEYS.ACTION_NEW_AGREEMENT,
                  icon: 'bx-discussion',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
               {
                  id: SIDEBAR_OPTIONS.LOANS_CALENDAR,
                  label: LOANS_I18N_KEYS.ACTION_CALENDAR,
                  icon: 'bx-calendar-check',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
               {
                  id: SIDEBAR_OPTIONS.LOANS_EXCEL,
                  label: LOANS_I18N_KEYS.ACTION_EXCEL,
                  icon: 'bx-table',
                  submenu: true,
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
            ],
         },
         {
            id: SIDEBAR_SECTIONS.LOANS_FILTERS,
            title: LOANS_I18N_KEYS.FILTERS_TITLE,
            type: 'filters',
            icon: 'bx-filter',
            fields: [
               { id: SIDEBAR_LOAN_FIELDS.SEARCH, label: LOANS_I18N_KEYS.FILTER_SEARCH, type: 'search' },
               { id: SIDEBAR_LOAN_FIELDS.BORROWERS, label: LOANS_I18N_KEYS.FILTER_BORROWERS, type: 'borrowers' },
               { id: SIDEBAR_LOAN_FIELDS.ISSUE, label: LOANS_I18N_KEYS.FILTER_ISSUE, type: 'daterange' },
               { id: SIDEBAR_LOAN_FIELDS.SETTLE, label: LOANS_I18N_KEYS.FILTER_SETTLE, type: 'daterange' },
               { id: SIDEBAR_LOAN_FIELDS.RATE, label: LOANS_I18N_KEYS.FILTER_RATE, type: 'range', unit: 'percent' },
               {
                  id: SIDEBAR_LOAN_FIELDS.PAYMENTS_RANGE,
                  label: LOANS_I18N_KEYS.FILTER_PAYMENTS_RANGE,
                  type: 'range',
                  unit: 'integer',
               },
               {
                  id: SIDEBAR_LOAN_FIELDS.WEEKLY_DAYS,
                  label: LOANS_I18N_KEYS.FILTER_WEEKLY_DAYS,
                  type: 'multiselect',
                  options: [
                     option('1', LOANS_I18N_KEYS.DAY_MONDAY),
                     option('2', LOANS_I18N_KEYS.DAY_TUESDAY),
                     option('3', LOANS_I18N_KEYS.DAY_WEDNESDAY),
                     option('4', LOANS_I18N_KEYS.DAY_THURSDAY),
                     option('5', LOANS_I18N_KEYS.DAY_FRIDAY),
                     option('6', LOANS_I18N_KEYS.DAY_SATURDAY),
                     option('7', LOANS_I18N_KEYS.DAY_SUNDAY),
                  ],
               },
               {
                  id: SIDEBAR_LOAN_FIELDS.MONTHLY_DAYS,
                  label: LOANS_I18N_KEYS.FILTER_MONTHLY_DAYS,
                  type: 'multiselect',
                  options: numbers(1, 31),
               },
               { id: SIDEBAR_LOAN_FIELDS.WITH_VISITS, label: LOANS_I18N_KEYS.FILTER_WITH_VISITS, type: 'checkbox' },
               { id: SIDEBAR_LOAN_FIELDS.WITH_MORA, label: LOANS_I18N_KEYS.FILTER_WITH_MORA, type: 'checkbox' },
               {
                  id: SIDEBAR_LOAN_FIELDS.TYPE,
                  label: LOANS_I18N_KEYS.FILTER_TYPE,
                  type: 'select',
                  options: [
                     option('monthly', LOANS_I18N_KEYS.TYPE_MONTHLY),
                     option('weekly', LOANS_I18N_KEYS.TYPE_WEEKLY),
                  ],
               },
               {
                  id: SIDEBAR_LOAN_FIELDS.PAYMENTS,
                  label: LOANS_I18N_KEYS.FILTER_PAYMENTS,
                  type: 'multiselect',
                  options: numbers(1, 13),
               },
               {
                  id: SIDEBAR_LOAN_FIELDS.STATUSES,
                  label: LOANS_I18N_KEYS.FILTER_STATUS,
                  type: 'multiselect',
                  options: [
                     option('pending', LOANS_I18N_KEYS.STATUS_PENDING),
                     option('active', LOANS_I18N_KEYS.STATUS_ACTIVE),
                     option('expired', LOANS_I18N_KEYS.STATUS_EXPIRED),
                     option('finished', LOANS_I18N_KEYS.STATUS_FINISHED),
                     option('rejected', LOANS_I18N_KEYS.STATUS_REJECTED),
                  ],
               },
               { id: SIDEBAR_LOAN_FIELDS.AMOUNT, label: LOANS_I18N_KEYS.FILTER_AMOUNT, type: 'range', unit: 'money' },
               { id: SIDEBAR_LOAN_FIELDS.TOTAL, label: LOANS_I18N_KEYS.FILTER_TOTAL, type: 'range', unit: 'money' },
            ],
         },
      ],
      [APPLICATION_MODULES.USERS]: [
         {
            id: SIDEBAR_SECTIONS.USERS_ACTIONS,
            title: USERS_I18N_KEYS.ACTIONS_TITLE,
            type: 'dropdown',
            button: { label: USERS_I18N_KEYS.ACTION_NEW_USER, icon: 'bx-grid-circle-plus' },
            options: [
               {
                  id: SIDEBAR_OPTIONS.USERS_ADMINISTRATOR,
                  label: USERS_I18N_KEYS.OPTION_ADMINISTRATOR,
                  icon: 'bx-shield',
                  allowed: { superadmin: true, administrator: true },
               },
               {
                  id: SIDEBAR_OPTIONS.USERS_MANAGER,
                  label: USERS_I18N_KEYS.OPTION_MANAGER,
                  icon: 'bx-briefcase',
                  allowed: { superadmin: true, administrator: true },
               },
               {
                  id: SIDEBAR_OPTIONS.USERS_INVESTOR,
                  label: USERS_I18N_KEYS.OPTION_INVESTOR,
                  icon: 'bx-trending-up',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
               {
                  id: SIDEBAR_OPTIONS.USERS_BORROWER,
                  label: USERS_I18N_KEYS.OPTION_BORROWER,
                  icon: 'bx-user',
                  allowed: { superadmin: true, administrator: true, manager: true },
               },
            ],
         },
         {
            id: SIDEBAR_SECTIONS.USERS_FILTERS,
            title: USERS_I18N_KEYS.FILTERS_TITLE,
            type: 'filters',
            icon: 'bx-filter',
            fields: [
               { id: SIDEBAR_FIELDS.SEARCH, label: USERS_I18N_KEYS.FILTER_SEARCH, type: 'search' },
               {
                  id: SIDEBAR_FIELDS.PROFILE,
                  label: USERS_I18N_KEYS.FILTER_PROFILE,
                  type: 'select',
                  options: [
                     {
                        id: 'superadmin',
                        label: USERS_I18N_KEYS.ROLE_SUPERADMIN,
                        allowed: { superadmin: true, administrator: true },
                     },
                     {
                        id: 'administrator',
                        label: USERS_I18N_KEYS.ROLE_ADMINISTRATOR,
                        allowed: { superadmin: true, administrator: true },
                     },
                     {
                        id: 'manager',
                        label: USERS_I18N_KEYS.ROLE_MANAGER,
                        allowed: { superadmin: true, administrator: true },
                     },
                     {
                        id: 'investor',
                        label: USERS_I18N_KEYS.ROLE_INVESTOR,
                        allowed: { superadmin: true, administrator: true, manager: true },
                     },
                     {
                        id: 'borrower',
                        label: USERS_I18N_KEYS.ROLE_BORROWER,
                        allowed: { superadmin: true, administrator: true, manager: true },
                     },
                  ],
               },
               {
                  id: SIDEBAR_FIELDS.STATUS,
                  label: USERS_I18N_KEYS.FILTER_STATUS,
                  type: 'select',
                  options: [
                     {
                        id: 'active',
                        label: USERS_I18N_KEYS.STATUS_ACTIVE,
                        allowed: { superadmin: true, administrator: true, manager: true },
                     },
                     {
                        id: 'inactive',
                        label: USERS_I18N_KEYS.STATUS_INACTIVE,
                        allowed: { superadmin: true, administrator: true, manager: true },
                     },
                  ],
               },
            ],
         },
      ],
   };

   /**
    * Sections of a module
    */
   public sectionsOf({ module }: { module: ApplicationModule }): SidebarSection[] {
      return this.sections[module] ?? [];
   }

   /**
    * Notifies the active page that an option was chosen
    */
   public select({ section, option }: { section: string; option: string }): void {
      this._selection.next({ module: this._navigation.currentModule, section, option });
   }

   /**
    * Value typed or selected (not applied yet) in a filter field
    */
   public valueOf({ section, field }: { section: string; field: string }): string {
      return this.$values()[section]?.[field] ?? '';
   }

   public setValue({ section, field, value }: { section: string; field: string; value: string }): void {
      this.$values.update((current: Record<string, SidebarFilterValues>) => ({
         ...current,
         [section]: { ...current[section], [field]: value },
      }));
   }

   /**
    * Applies the filters of a section: only the fields with a value are sent
    */
   public applyFilters({ section }: { section: string }): void {
      const values: SidebarFilterValues = {};

      for (const [field, value] of Object.entries(this.$values()[section] ?? {})) {
         if (value.trim() !== '') values[field] = value.trim();
      }

      this._filters.next({ module: this._navigation.currentModule, section, values });
   }

   /**
    * Empties the fields of a section & notifies there are no filters
    */
   public clearFilters({ section }: { section: string }): void {
      this.resetFilters();
      this._filters.next({ module: this._navigation.currentModule, section, values: {} });
   }

   /**
    * Empties every field without notifying (used when entering a module)
    */
   public resetFilters(): void {
      this.$values.set({});
   }
}
