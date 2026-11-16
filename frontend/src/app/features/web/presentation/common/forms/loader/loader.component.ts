import { Component, input, InputSignal } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
   selector: 'fi-loader-component',
   imports: [NgClass],
   template: `
      <div
         class="loader-clip-path size-5 animate-spin rounded-full border-2"
         [ngClass]="{
            'border-second': $tone() === 'second',
            'border-white': $tone() === 'white',
         }"
      ></div>
   `,
})
export class LoaderComponent {
   public $tone: InputSignal<'second' | 'white'> = input<'second' | 'white'>('second', { alias: 'tone' });
}
