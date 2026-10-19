import { Component, computed, inject, Signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { DialogsService } from '../../../../../data/services/dialogs.service';
import { TemplateHeaderComponent } from './components/template-header.component';
import { DialogData } from '../../../../../../interfaces/dialogs';

@Component({
   selector: 'fi-template-dialog-component',
   imports: [NgComponentOutlet, TemplateHeaderComponent],
   template: `
      @let loading = $loading();
      @let dialogData = $dialogData();
      @let hasHistory = $hasHistory();

      <section class="w-3xl flex flex-col items-start justify-start pt-4.5 gap-4">
         <fi-template-header-component
            class="w-full flex"
            [title]="dialogData ? dialogData.title : ''"
            [loading]="loading"
            [hasHistory]="hasHistory"
            (back)="handleBack()"
            (close)="handleClose()"
         />

         @if (dialogData) {
            <main class="w-full flex [&>*:first-child]:w-full px-3">
               <ng-container *ngComponentOutlet="dialogData.component" />
            </main>
         }
      </section>
   `,
})
export class TemplateDialogComponent {
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
