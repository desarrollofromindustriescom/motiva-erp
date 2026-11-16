import { Type } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

export type DialogSize = 'sm' | 'lg';

export interface DialogData {
   title: string;
   titleParams?: Record<string, string>;
   size: DialogSize;
   component: Type<any>;
   ref: DynamicDialogRef<any>;
}
