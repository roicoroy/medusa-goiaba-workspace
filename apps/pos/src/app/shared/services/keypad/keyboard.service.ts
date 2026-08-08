import { Injectable, EventEmitter, Output, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';
import { IKeyboardService } from './IKeyboard';
import {
  KeyboardContextPatch,
  UpdateKeyboardContext,
  UpdateKeyboardStatus,
} from '../../../store/keyboard/keyboard.actions';

@Injectable({
  providedIn: 'root',
})
export class KeyboardService implements IKeyboardService {
  @Output() keyboardWillShow = new EventEmitter<KeyboardInfo>();

  @Output() keyboardDidShow = new EventEmitter<KeyboardInfo>();

  @Output() keyboardWillHide = new EventEmitter<void>();

  @Output() keyboardDidHide = new EventEmitter<void>();

  private store = inject(Store);
  private nativeListenersInitialized = false;
  private webListenersInitialized = false;
  private currentContext: {
    isOpen: boolean;
    keyboardHeight: number;
    source: 'native' | 'web';
    platform: 'native' | 'web';
    focusedTag: string | null;
  } = {
    isOpen: false,
    keyboardHeight: 0,
    source: 'web',
    platform: 'web',
    focusedTag: null as string | null,
  };

  async initNativeKeyboardListeners(): Promise<void> {
    if (this.nativeListenersInitialized) {
      return;
    }

    this.nativeListenersInitialized = true;
    this.updateKeyboardContext({
      platform: 'native',
      source: 'native',
      focusedTag: this.getFocusedTag(),
    });

    await Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      this.keyboardWillShow.emit(info);
      this.updateKeyboardContext({
        isOpen: true,
        keyboardHeight: info.keyboardHeight ?? 0,
        source: 'native',
        platform: 'native',
        focusedTag: this.getFocusedTag(),
      });
    });

    await Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardWillHide.emit();
      this.updateKeyboardContext({
        isOpen: false,
        keyboardHeight: 0,
        source: 'native',
        platform: 'native',
        focusedTag: this.getFocusedTag(),
      });
    });

    await Keyboard.addListener('keyboardDidShow', (info: KeyboardInfo) => {
      this.keyboardDidShow.emit(info);
    });

    await Keyboard.addListener('keyboardDidHide', () => {
      this.blurActiveElement();
      this.keyboardDidHide.emit();
    });
  }

  async initKeyboardListeners(): Promise<void> {
    return this.initNativeKeyboardListeners();
  }

  initWebKeyboardListeners(): void {
    this.updateKeyboardContext({
      isOpen: false,
      keyboardHeight: 0,
      platform: 'web',
      source: 'web',
      focusedTag: this.getFocusedTag(),
    });
  }

  private estimateViewportKeyboardHeight(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    const viewportHeight = window.visualViewport?.height;

    if (!viewportHeight) {
      return 0;
    }

    const heightDiff = Math.round(window.innerHeight - viewportHeight);

    return heightDiff > 120 ? heightDiff : 0;
  }

  private emitWebKeyboardEvents(isOpen: boolean, keyboardHeight: number): void {
    if (isOpen === this.currentContext.isOpen) {
      return;
    }

    if (isOpen) {
      const keyboardInfo = { keyboardHeight } as KeyboardInfo;
      this.keyboardWillShow.emit(keyboardInfo);
      this.keyboardDidShow.emit(keyboardInfo);
      return;
    }

    this.keyboardWillHide.emit();
    this.keyboardDidHide.emit();
  }

  private isLikelyMobileWeb(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    const coarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const mobileUserAgent =
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const smallViewport = window.innerWidth <= 1024;

    return coarsePointer || (mobileUserAgent && smallViewport);
  }

  private isEditableElement(element: HTMLElement | null): boolean {
    if (!element) {
      return false;
    }

    if (element instanceof HTMLTextAreaElement) {
      return true;
    }

    if (element instanceof HTMLInputElement) {
      return (
        element.type !== 'button' &&
        element.type !== 'checkbox' &&
        element.type !== 'radio' &&
        element.type !== 'range' &&
        element.type !== 'file' &&
        element.type !== 'submit' &&
        element.type !== 'reset'
      );
    }

    return element.isContentEditable;
  }

  private getFocusedTag(activeElement?: HTMLElement | null): string | null {
    const resolvedElement =
      activeElement ??
      (typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement | null)
        : null);

    if (!resolvedElement) {
      return null;
    }

    return resolvedElement.tagName?.toLowerCase() ?? null;
  }

  private updateKeyboardContext(patch: KeyboardContextPatch): void {
    const nextContext = {
      ...this.currentContext,
      ...patch,
    };

    if (!nextContext.isOpen) {
      nextContext.keyboardHeight = 0;
    }

    const changed =
      nextContext.isOpen !== this.currentContext.isOpen ||
      nextContext.keyboardHeight !== this.currentContext.keyboardHeight ||
      nextContext.source !== this.currentContext.source ||
      nextContext.platform !== this.currentContext.platform ||
      nextContext.focusedTag !== this.currentContext.focusedTag;

    if (!changed) {
      return;
    }

    this.currentContext = nextContext;
    this.store.dispatch(
      new UpdateKeyboardContext({ ...nextContext, updatedAt: Date.now() }),
    );
  }

  private updateKeyboardStatus(isOpen: boolean): void {
    if (this.currentContext.isOpen === isOpen) {
      return;
    }

    this.currentContext = {
      ...this.currentContext,
      isOpen,
      keyboardHeight: isOpen ? this.currentContext.keyboardHeight : 0,
    };
    this.store.dispatch(new UpdateKeyboardStatus(isOpen));
  }

  private blurActiveElement(): void {
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();
  }

  async setAccessoryBarVisible(isBarVisible: boolean): Promise<void> {
    try {
      return await Keyboard.setAccessoryBarVisible({ isVisible: isBarVisible });
    } catch (error) {
      throw error;
    }
  }

  async hideKeyboard(): Promise<void> {
    try {
      return await Keyboard.hide();
    } catch (error) {
      throw error;
    }
  }

  async showKeyboard(): Promise<void> {
    try {
      return await Keyboard.show();
    } catch (error) {
      throw error;
    }
  }

  async setScroll(options: { isDisabled: boolean }): Promise<void> {
    try {
      return await Keyboard.setScroll(options);
    } catch (error) {
      throw error;
    }
  }
}
