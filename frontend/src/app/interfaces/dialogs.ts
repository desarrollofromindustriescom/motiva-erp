import { Type } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

export interface DialogData {
   title: string;
   component: Type<any>;
   ref: DynamicDialogRef<any>;
}
