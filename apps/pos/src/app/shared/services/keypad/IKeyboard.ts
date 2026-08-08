import { EventEmitter } from '@angular/core';
import { KeyboardInfo } from '@capacitor/keyboard';

export interface IKeyboardService {
  keyboardWillShow: EventEmitter<KeyboardInfo>;

  keyboardDidShow: EventEmitter<KeyboardInfo>;

  keyboardWillHide: EventEmitter<void>;

  keyboardDidHide: EventEmitter<void>;

  setAccessoryBarVisible(isBarVisible: boolean): Promise<void>;

  hideKeyboard(): Promise<void>;

  showKeyboard(): Promise<void>;

  setScroll(options: { isDisabled: boolean }): Promise<void>;
}
