import { Component, input, InputSignal } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { FieldErrorsComponent } from '../../../forms/field-errors/field-errors.component';

@Component({
   selector: 'fi-setting-field-component',
   imports: [FormField, InputTextModule, IftaLabelModule, IconFieldModule, InputIconModule, FieldErrorsComponent],
   template: `
      @let symbol = $symbol();

      <fi-field-errors-component
         class="w-full"
         [field]="$field()()"
      >
         <p-iftalabel class="w-full">
            <p-iconfield>
               <input
                  pInputText
                  type="number"
                  step="any"
                  inputmode="decimal"
                  class="transition-all"
                  [id]="$id()"
                  [fluid]="true"
                  [formField]="$field()"
                  [class.text-right]="symbol === '%'"
                  [class.pl-9!]="symbol === '$'"
               />
               @if (symbol) {
                  <p-inputicon
                     class="top-[62%]! -translate-y-1/2 text-lg font-medium"
                     [class.left-3!]="symbol === '$'"
                     [class.right-3!]="symbol === '%'"
                  >
                     {{ symbol }}
                  </p-inputicon>
               }
            </p-iconfield>
            <label [for]="$id()">{{ $label() }} *</label>
         </p-iftalabel>
      </fi-field-errors-component>
   `,
})
export class SettingFieldComponent {
   public $id: InputSignal<string> = input.required<string>({ alias: 'inputId' });
   public $label: InputSignal<string> = input.required<string>({ alias: 'label' });
   public $field: InputSignal<FieldTree<number | null>> = input.required<FieldTree<number | null>>({
      alias: 'field',
   });
   public $symbol: InputSignal<'%' | '$' | null> = input<'%' | '$' | null>(null, { alias: 'symbol' });
}
