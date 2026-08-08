import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { PreferencesState } from '../../../store/preferences/preferences.state';
import {
  InitializePreferences,
  ThemeMode,
} from '../../../store/preferences/preferences.actions';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly store = inject(Store);

  private initialized = false;
  private mediaQuery: MediaQueryList | null = null;
  private mediaQueryListener: ((event: MediaQueryListEvent) => void) | null =
    null;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.store.dispatch(new InitializePreferences());

    this.setupSystemListener();
    this.apply(this.store.selectSnapshot(PreferencesState.themeMode));

    this.store.select(PreferencesState.themeMode).subscribe((mode) => {
      this.apply(mode);
    });
  }

  private apply(mode: ThemeMode): void {
    if (typeof document === 'undefined') {
      return;
    }

    const isDark = this.resolveIsDark(mode);
    const root = document.documentElement;
    const body = document.body;
    const ionApp = document.querySelector('ion-app');
    const targets: Array<HTMLElement | null> = [
      root,
      body,
      ionApp as HTMLElement | null,
    ];

    for (const target of targets) {
      if (!target) {
        continue;
      }

      // Ionic dark.class.css expects ion-palette-dark, while Tailwind/Daisy often use dark/data-theme.
      target.classList.toggle('ion-palette-dark', isDark);
      target.classList.toggle('dark', isDark);
      target.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    root.style.colorScheme = isDark ? 'dark' : 'light';
  }

  private resolveIsDark(mode: ThemeMode): boolean {
    if (mode === 'dark') {
      return true;
    }

    if (mode === 'light') {
      return false;
    }

    return this.prefersDark();
  }

  private prefersDark(): boolean {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private setupSystemListener(): void {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueryListener = () => {
      const mode = this.store.selectSnapshot(PreferencesState.themeMode);

      if (mode === 'system') {
        this.apply(mode);
      }
    };

    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
  }
}
