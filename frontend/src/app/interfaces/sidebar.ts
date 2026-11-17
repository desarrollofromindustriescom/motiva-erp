import { ApplicationModule } from './navigation';
import { UserProfile } from './user';

export interface SidebarOption {
   id: string;
   label: string;
   icon: string;
   allowed: Partial<Record<UserProfile, boolean>>;
}

export interface SidebarSection {
   id: string;
   title: string;
   type: 'dropdown';
   button: { label: string; icon: string };
   options: SidebarOption[];
}

export type SidebarSections = Partial<Record<ApplicationModule, SidebarSection[]>>;

export interface SidebarSelection {
   module: ApplicationModule;
   section: string;
   option: string;
}
