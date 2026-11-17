import { ApplicationModule } from './navigation';
import { UserProfile } from './user';

export interface SidebarOption {
   id: string;
   label: string;
   icon?: string;
   // shows an arrow because the option will open more options
   submenu?: boolean;
   allowed: Partial<Record<UserProfile, boolean>>;
}

/**
 * - search: free text
 * - select: one option
 * - multiselect: several options, the value is their ids separated by comma
 * - borrowers: several borrowers searched on the server, the value is their ids separated by comma
 * - daterange: two days, the value is "YYYY-MM-DD,YYYY-MM-DD"
 * - range: a minimum & a maximum, the value is "min,max" (any of them can be empty)
 * - checkbox: the value is "true" when checked
 */
export interface SidebarField {
   id: string;
   label: string;
   type: 'search' | 'select' | 'multiselect' | 'borrowers' | 'daterange' | 'range' | 'checkbox';
   options?: SidebarOption[];
   unit?: 'percent' | 'integer' | 'money';
}

export interface SidebarDropdownSection {
   id: string;
   title: string;
   type: 'dropdown';
   button: { label: string; icon: string };
   options: SidebarOption[];
}

/**
 * Section with one button for each option, the page decides what each one does
 */
export interface SidebarActionsSection {
   id: string;
   title: string;
   type: 'actions';
   options: SidebarOption[];
}

export interface SidebarFiltersSection {
   id: string;
   title: string;
   type: 'filters';
   icon: string;
   fields: SidebarField[];
}

export type SidebarSection = SidebarDropdownSection | SidebarActionsSection | SidebarFiltersSection;

export type SidebarSections = Partial<Record<ApplicationModule, SidebarSection[]>>;

export type SidebarFilterValues = Record<string, string>;

export interface SidebarSelection {
   module: ApplicationModule;
   section: string;
   option: string;
}

export interface SidebarFiltersEvent {
   module: ApplicationModule;
   section: string;
   values: SidebarFilterValues;
}
