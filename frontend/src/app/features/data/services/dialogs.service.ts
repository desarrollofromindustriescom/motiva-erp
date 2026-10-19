import { inject, Injectable, signal, Type, WritableSignal } from '@angular/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DialogData } from '../../../interfaces/dialogs';
import { TemplateDialogComponent } from '../../web/presentation/common/dialogs/template/template.dialog.component';
import Swal, { SweetAlertIcon } from 'sweetalert2';
import { DIALOG_I18N_KEYS } from '../repository/dialog.repository';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { FORMS_I18N_KEYS } from '../repository/forms.repository';

@Injectable({ providedIn: 'root' })
export class DialogsService {
   private readonly _dialog: DialogService = inject(DialogService);
   private readonly _translate: TranslateService = inject(TranslateService);
   private readonly _confirmation: ConfirmationService = inject(ConfirmationService);

   private readonly $loading: WritableSignal<boolean> = signal(false);
   private readonly $dialogs: WritableSignal<DialogData[]> = signal([]);

   constructor() {}

   public get loading(): boolean {
      return this.$loading();
   }

   public set loading(value: boolean) {
      this.$loading.set(value);
   }

   public get dialogs(): DialogData[] {
      return this.$dialogs();
   }

   private openTemplate(): DynamicDialogRef<any> | null {
      return this._dialog.open(TemplateDialogComponent, {
         closeOnEscape: false,
         showHeader: false,
         modal: true,
         focusOnShow: false,
      });
   }

   /**
    *
    */
   public newDialog({ title, component }: { title: string; component: Type<any> }): void {
      const ref: DynamicDialogRef<any> | null = this.openTemplate();

      if (!ref) return;

      this.$dialogs.update((current: DialogData[]) => [...current, { ref, title, component }]);
   }

   /**
    *
    */
   public closeDialogs(): void {
      const current: DialogData | undefined = this.$dialogs().at(-1);

      if (current) current.ref.close();

      this.$dialogs.set([]);
   }

   /**
    *
    */
   public dialogBack(): void {
      const dialogs: DialogData[] = this.$dialogs();
      const current: DialogData | undefined = dialogs.pop();

      if (current) current.ref.close();

      const previous: DialogData | undefined = dialogs.at(-1);
      if (!previous) return;

      const ref: DynamicDialogRef<any> | null = this.openTemplate();

      if (ref) {
         previous.ref = ref;
         this.$dialogs.set([...dialogs]);
         return;
      }

      dialogs.pop();
      this.closeDialogs();
      Swal.fire({
         title: this._translate.instant(DIALOG_I18N_KEYS.ERR_OPEN_BACK_DIALOG),
         icon: 'error',
         timer: 5000,
      });
   }

   /**
    *
    */
   public confirmation({ message }: { message: string }): Promise<void> {
      return new Promise((resolve, reject) => {
         this._confirmation.confirm({
            header: this._translate.instant(DIALOG_I18N_KEYS.CONFIRM_TITLE),
            message: this._translate.instant(message),
            icon: 'bx bx-alert-triangle',
            rejectButtonProps: {
               label: this._translate.instant(FORMS_I18N_KEYS.BUTTON_CANCEL),
               severity: 'danger',
            },
            acceptButtonProps: {
               label: this._translate.instant(FORMS_I18N_KEYS.BUTTON_CONTINUE),
            },
            accept: () => resolve(),
            reject,
         });
      });
   }

   /**
    *
    */
   public alert({
      severity,
      text,
      title,
      duration,
   }: {
      severity: SweetAlertIcon;
      text: string;
      title?: string;
      duration?: number;
   }): void {
      Swal.fire({
         icon: severity,
         timer: duration || 30000,
         text: this._translate.instant(text),
         title: title ? this._translate.instant(title) : undefined,
         confirmButtonText: this._translate.instant(FORMS_I18N_KEYS.BUTTON_CLOSE),
      });
   }
}
