import { Component, computed, inject, Signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { DialogsService } from '../../../../../data/services/dialogs.service';
import { DialogHeaderComponent } from './components/dialog-header.component';
import { DialogData } from '../../../../../../interfaces/dialogs';

@Component({
   selector: 'fi-dialog-layout-component',
   imports: [NgComponentOutlet, DialogHeaderComponent],
   template: `
      @let loading = $loading();
      @let dialogData = $dialogData();
      @let hasHistory = $hasHistory();

      <section class="flex w-full flex-col items-start justify-start gap-4 pt-4.5">
         <fi-dialog-header-component
            class="flex w-full"
            [title]="dialogData ? dialogData.title : ''"
            [loading]="loading"
            [hasHistory]="hasHistory"
            (back)="handleBack()"
            (close)="handleClose()"
         />

         @if (dialogData) {
            <main class="flex max-h-[70dvh] w-full overflow-y-auto px-3 pb-3 [&>*:first-child]:w-full">
               <ng-container *ngComponentOutlet="dialogData.component" />
            </main>
         }
      </section>
   `,
})
export class DialogLayoutComponent {
   private readonly _dialogs: DialogsService = inject(DialogsService);

   public $loading: Signal<boolean> = computed(() => this._dialogs.loading);
   public $hasHistory: Signal<boolean> = computed(() => this._dialogs.dialogs.length > 1);
   public $dialogData: Signal<DialogData | undefined> = computed(() => {
      const dialogs: DialogData[] = this._dialogs.dialogs;
      return dialogs.at(-1);
   });

   public handleBack(): void {
      this._dialogs.dialogBack();
   }

   public handleClose(): void {
      this._dialogs.closeDialogs();
   }
}
