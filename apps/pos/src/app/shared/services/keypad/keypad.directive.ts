import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { KeypadFacade } from './keypad.facade';

@Directive({
  selector: '[appHideWhenKeypadVisible]',
})
export class KeyPadDirective implements OnDestroy {
  private readonly targetElement = inject(ElementRef);
  private readonly keypadFacade = inject(KeypadFacade);
  private subscription: Subscription;

  constructor() {
    const originalStyle = this.targetElement.nativeElement.style.display;

    this.subscription = this.keypadFacade.keyboardIsOpen$.subscribe(
      (keyboardStatus: boolean) => {
        setTimeout(() => {
          this.targetElement.nativeElement.style.display = keyboardStatus
            ? 'none'
            : originalStyle;
        }, 25);
      },
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
