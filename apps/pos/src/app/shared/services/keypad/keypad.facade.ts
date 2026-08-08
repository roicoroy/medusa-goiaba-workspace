import { computed, inject, Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { KeyboardState } from '../../../store/keyboard/keyboard.state';

@Injectable({
  providedIn: 'root',
})
export class KeypadFacade {
  private readonly store = inject(Store);

  readonly keyboardIsOpen$: Observable<boolean> = this.store.select(
    KeyboardState.isOpen,
  );
  readonly keyboardState = this.store.selectSignal(KeyboardState.getState);
  readonly keyboardIsOpen = computed(() => this.keyboardState().isOpen);
  readonly keyboardHeight = computed(() => this.keyboardState().keyboardHeight);
  readonly keyboardSource = computed(() => this.keyboardState().source);
}
