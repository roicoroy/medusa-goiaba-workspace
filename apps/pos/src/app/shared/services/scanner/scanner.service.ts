import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, fromEvent, Subscription, buffer, debounceTime, filter, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScannerService implements OnDestroy {
  private scannedBarcodeSubject = new Subject<string>();
  public readonly scannedBarcode$ = this.scannedBarcodeSubject.asObservable();
  
  private keydownSubscription?: Subscription;

  // Configuration
  private readonly MAX_KEYSTROKE_DELAY_MS = 50; 
  private readonly MIN_BARCODE_LENGTH = 4;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initScannerListener();
    }
  }

  private initScannerListener() {
    // A USB scanner acts like a keyboard typing very fast, ending with 'Enter'.
    const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      filter(event => !this.isInputElement(event.target as HTMLElement))
    );

    // Debounce represents the end of a scanning burst.
    // If no key is pressed for 50ms, the buffer flushes.
    const debouncedKeydown$ = keydown$.pipe(debounceTime(this.MAX_KEYSTROKE_DELAY_MS));

    this.keydownSubscription = keydown$
      .pipe(
        buffer(debouncedKeydown$),
        map((events: KeyboardEvent[]) => {
          // Filter out purely modifier keys
          const keys = events
            .map(e => e.key)
            .filter(k => k.length === 1 || k === 'Enter');
          return keys;
        }),
        filter(keys => {
          // A valid scan must have minimum length and ideally end with Enter.
          // Depending on the scanner configuration, some don't send Enter, 
          // but they type very fast so the debounce catches them.
          return keys.length >= this.MIN_BARCODE_LENGTH;
        }),
        map(keys => {
          // Remove 'Enter' from the final string
          return keys.filter(k => k !== 'Enter').join('');
        })
      )
      .subscribe(barcode => {
        if (barcode) {
          this.scannedBarcodeSubject.next(barcode);
        }
      });
  }

  private isInputElement(element: HTMLElement | null): boolean {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || element.isContentEditable;
  }

  ngOnDestroy() {
    if (this.keydownSubscription) {
      this.keydownSubscription.unsubscribe();
    }
  }
}
