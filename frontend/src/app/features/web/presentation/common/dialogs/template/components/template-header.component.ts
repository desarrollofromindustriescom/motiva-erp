import { NgClass } from '@angular/common';
import { Component, computed, input, InputSignal, output, OutputEmitterRef, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LoaderComponent } from '../../../forms/loader/loader.component';

@Component({
   selector: 'fi-template-header-component',
   imports: [TranslatePipe, NgClass, LoaderComponent],
   template: `
      @let title = $title();
      @let loading = $loading();
      @let headerActions = $headerActions();

      <header class="w-full flex flex-col items-start justify-start gap-1.5">
         <div
            class="w-full flex items-center"
            [ngClass]="{
               'justify-end': headerActions.length < 2,
               'justify-between': headerActions.length > 1,
            }"
         >
            @for (action of headerActions; track $index) {
               <button
                  class="group cursor-pointer flex items-center justify-center size-10 rounded-full bg-white hover:bg-slate-200 focus:bg-slate-200 transition-all"
                  (click)="action.handle()"
               >
                  <i
                     [class]="
                        'text-slate-400 bx text-2xl group-hover:text-slate-900 group-focus:text-slate-900 transition-all ' +
                        action.icon
                     "
                  ></i>
               </button>
            }
         </div>
         <div class="w-full flex items-end justify-between px-3">
            <h2 class="text-xl font-medium">{{ title | translate }}</h2>
            @if (loading) {
               <fi-loader-component />
            }
         </div>
      </header>
   `,
})
export class TemplateHeaderComponent {
   public $title: InputSignal<string> = input('', { alias: 'title' });
   public $loading: InputSignal<boolean> = input(false, { alias: 'loading' });
   public $hasHistory: InputSignal<boolean> = input(false, { alias: 'hasHistory' });

   public $back: OutputEmitterRef<void> = output({ alias: 'back' });
   public $close: OutputEmitterRef<void> = output({ alias: 'close' });

   public $headerActions: Signal<{ icon: string; handle: Function }[]> = computed(() => {
      const actions: { icon: string; handle: Function }[] = [
         {
            icon: 'bx-x',
            handle: () => untracked(() => this.$close.emit()),
         },
      ];

      if (this.$hasHistory())
         actions.unshift({
            icon: 'bx-undo',
            handle: () => untracked(() => this.$back.emit()),
         });

      return actions;
   });
}
