import { NgClass } from '@angular/common';
import { Component, computed, input, InputSignal, output, OutputEmitterRef, Signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LoaderComponent } from '../../../forms/loader/loader.component';

@Component({
   selector: 'fi-dialog-header-component',
   imports: [TranslatePipe, NgClass, LoaderComponent],
   template: `
      @let title = $title();
      @let titleParams = $titleParams();
      @let loading = $loading();
      @let headerActions = $headerActions();

      <header class="flex w-full flex-col items-start justify-start gap-1.5">
         <div
            class="flex w-full items-center"
            [ngClass]="{
               'justify-end': headerActions.length < 2,
               'justify-between': headerActions.length > 1,
            }"
         >
            @for (action of headerActions; track $index) {
               <button
                  class="group flex size-10 cursor-pointer items-center justify-center rounded-full bg-white transition-all hover:bg-slate-200 focus:bg-slate-200 disabled:cursor-auto disabled:opacity-60 disabled:hover:bg-white disabled:focus:bg-white"
                  [disabled]="loading"
                  (click)="action.handle()"
               >
                  <i
                     [class]="
                        'bx text-2xl text-slate-400 transition-all group-hover:text-slate-900 group-focus:text-slate-900 group-disabled:group-hover:text-slate-400 group-disabled:group-focus:text-slate-400 ' +
                        action.icon
                     "
                  ></i>
               </button>
            }
         </div>
         <div class="flex w-full items-end justify-between px-3">
            <h2 class="text-xl font-medium">{{ title | translate: titleParams }}</h2>
            @if (loading) {
               <fi-loader-component />
            }
         </div>
      </header>
   `,
})
export class DialogHeaderComponent {
   public $title: InputSignal<string> = input('', { alias: 'title' });
   public $titleParams: InputSignal<Record<string, string> | undefined> = input<Record<string, string> | undefined>(
      undefined,
      { alias: 'titleParams' },
   );
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
