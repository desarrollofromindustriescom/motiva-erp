import { Component, computed, input, InputSignal, Signal } from '@angular/core';
import { FieldState, ValidationError } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
   selector: 'fi-field-errors-component',
   imports: [TranslatePipe],
   template: `
      @let field = $field();
      @let params = $params();

      <div class="w-full flex flex-col gap-1">
         <ng-content />

         <ul class="w-full flex flex-col">
            @if (field.touched() && field.invalid()) {
               @for (error of field.errors(); track error.kind) {
                  <li class="text-red-500 text-xs">
                     • {{ error.message | translate: { Param: params[error.kind] || '' } }}
                  </li>
               }
            }
         </ul>
      </div>
   `,
})
export class FieldErrorsComponent {
   public $field: InputSignal<FieldState<string | number, string>> = input.required({ alias: 'field' });
   public $params: Signal<Record<string, string>> = computed(() => {
      const field: FieldState<string | number, string> = this.$field();
      const errors: ValidationError.WithFieldTree[] = field.errors();
      const params: Record<string, string> = {};

      for (let i: number = 0; i < errors.length; i++) {
         if (!(errors[i] as any)[errors[i].kind]) continue;
         params[errors[i].kind] = (errors[i] as any)[errors[i].kind];
      }

      console.log('ex');

      return params;
   });
}
