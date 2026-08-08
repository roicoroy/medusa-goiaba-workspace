import { Injectable, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DebugEventsService } from '../debug-events/debug-events.service';

export interface LoadingOptions {
  message?: string;
  duration?: number;
  cssClass?: string;
  backdropDismiss?: boolean;
  translationKey?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingController = inject(LoadingController);
  private translate = inject(TranslateService);
  private debugEvents = inject(DebugEventsService);
  private activeLoaders = new Set<HTMLIonLoadingElement>();

  /**
   * Shows a loading indicator with customizable options
   * @param options - Loading configuration options
   * @returns Promise<HTMLIonLoadingElement>
   */
  async showLoading(
    options: LoadingOptions = {},
  ): Promise<HTMLIonLoadingElement> {
    const message = options.translationKey
      ? await this.translate.get(options.translationKey).toPromise()
      : options.message ||
        (await this.translate.get('COMMON.LOADING').toPromise()) ||
        'Loading...';

    const loading = await this.loadingController.create({
      message,
      duration: options.duration,
      cssClass: options.cssClass,
      backdropDismiss: options.backdropDismiss ?? false,
    });

    this.activeLoaders.add(loading);

    // Remove from active loaders when dismissed
    loading.onDidDismiss().then(() => {
      this.activeLoaders.delete(loading);
    });

    await loading.present();
    return loading;
  }

  /**
   * Shows a simple loading indicator
   * @param message - Optional custom message
   * @returns Promise<HTMLIonLoadingElement>
   */
  async simpleLoader(message?: string): Promise<HTMLIonLoadingElement> {
    return this.showLoading({ message });
  }

  /**
   * Shows a loading indicator with auto-dismiss
   * @param duration - Duration in milliseconds
   * @param message - Optional custom message
   * @returns Promise<HTMLIonLoadingElement>
   */
  async autoLoader(
    duration: number,
    message?: string,
  ): Promise<HTMLIonLoadingElement> {
    return this.showLoading({
      duration,
      message:
        message ||
        (await this.translate.get('COMMON.PLEASE_WAIT').toPromise()) ||
        'Please wait...',
    });
  }

  /**
   * Shows a custom styled loading indicator
   * @param cssClass - CSS class for custom styling
   * @param message - Optional custom message
   * @returns Promise<HTMLIonLoadingElement>
   */
  async customLoader(
    cssClass: string,
    message?: string,
  ): Promise<HTMLIonLoadingElement> {
    return this.showLoading({
      cssClass,
      message,
      backdropDismiss: true,
    });
  }

  /**
   * Dismisses the most recent loading indicator
   * @returns Promise<boolean>
   */
  async dismissLoader(): Promise<boolean> {
    try {
      return await this.loadingController.dismiss();
    } catch (error) {
      this.debugEvents.log('LoadingService', 'loader:dismiss:failed', {
        kind: 'application',
        level: 'warn',
        context: { error: error as Record<string, unknown> },
      });
      return false;
    }
  }

  /**
   * Dismisses all active loading indicators
   * @returns Promise<void>
   */
  async dismissAllLoaders(): Promise<void> {
    const dismissPromises = Array.from(this.activeLoaders).map((loader) =>
      loader.dismiss().catch((error) => {
        this.debugEvents.log(
          'LoadingService',
          'loader:dismiss-all:item-failed',
          {
            kind: 'application',
            level: 'warn',
            context: { error: error as Record<string, unknown> },
          },
        );
      }),
    );

    await Promise.all(dismissPromises);
    this.activeLoaders.clear();
  }

  /**
   * Wraps an async operation with loading indicator
   * @param operation - Async operation to wrap
   * @param options - Loading options
   * @returns Promise with operation result
   */
  async withLoading<T>(
    operation: () => Promise<T>,
    options: LoadingOptions = {},
  ): Promise<T> {
    const loading = await this.showLoading(options);

    try {
      const result = await operation();
      await loading.dismiss();
      return result;
    } catch (error) {
      await loading.dismiss();
      throw error;
    }
  }

  /**
   * Gets the number of active loaders
   * @returns Number of active loading indicators
   */
  getActiveLoadersCount(): number {
    return this.activeLoaders.size;
  }
}
