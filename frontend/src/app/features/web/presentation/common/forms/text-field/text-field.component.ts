import { Component, input, InputSignal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
import { SignalForm } from '../../../../../../interfaces/alias';
import { FieldErrorsComponent } from '../field-errors/field-errors.component';

/**
 * Text input with floating label & validation errors
 */
@Component({
   selector: 'fi-text-field-component',
   imports: [FormField, TranslatePipe, IftaLabelModule, InputTextModule, FieldErrorsComponent],
   template: `
      @let field = $field();
      @let id = $id();

      <fi-field-errors-component
         class="w-full"
         [field]="field()"
      >
         <p-iftalabel class="w-full">
            <input
               pInputText
               autocomplete="off"
               [class]="field().disabled() ? 'w-full bg-slate-200!' : 'w-full'"
               [id]="id"
               [attr.inputmode]="$inputmode()"
               [formField]="field"
            />
            <label [for]="id"
               >{{ $label() | translate }}
               @if ($required()) {
                  <span class="text-red-500">*</span>
               }
            </label>
         </p-iftalabel>
      </fi-field-errors-component>
   `,
})
export class TextFieldComponent {
   public $field: InputSignal<SignalForm<string>> = input.required<SignalForm<string>>({ alias: 'field' });
   public $id: InputSignal<string> = input.required<string>({ alias: 'id' });
   public $label: InputSignal<string> = input.required<string>({ alias: 'label' });
   public $required: InputSignal<boolean> = input(false, { alias: 'required' });
   public $inputmode: InputSignal<string | null> = input<string | null>(null, { alias: 'inputmode' });
}
