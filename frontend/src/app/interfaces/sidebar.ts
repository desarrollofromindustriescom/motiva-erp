import { ApplicationModule } from './navigation';
import { UserProfile } from './user';

export interface SidebarOption {
   id: string;
   label: string;
   icon?: string;
   allowed: Partial<Record<UserProfile, boolean>>;
}

export interface SidebarField {
   id: string;
   label: string;
   type: 'search' | 'select';
   options?: SidebarOption[];
}

export interface SidebarDropdownSection {
   id: string;
   title: string;
   type: 'dropdown';
   button: { label: string; icon: string };
   options: SidebarOption[];
}

export interface SidebarFiltersSection {
   id: string;
   title: string;
   type: 'filters';
   icon: string;
   fields: SidebarField[];
}

export type SidebarSection = SidebarDropdownSection | SidebarFiltersSection;

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
