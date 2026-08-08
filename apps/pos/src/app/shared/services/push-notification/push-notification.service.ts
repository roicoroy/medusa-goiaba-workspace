import { Injectable, inject } from '@angular/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
  PermissionStatus,
} from '@capacitor/push-notifications';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { ToastController } from '@ionic/angular/standalone';
import {
  BehaviorSubject,
  firstValueFrom,
  filter,
  timeout,
  catchError,
  of,
} from 'rxjs';

import { DeviceTokenPayload } from '../device-token-api/device-token-api.service';
import { PreferencesState } from '../../../store/preferences/preferences.state';
import { SetDeviceId } from '../../../store/preferences/preferences.actions';
import { DebugEventsService } from '../debug-events/debug-events.service';
import { PlatformFacade } from '../../../store/platform/platform.facade';
import { RuntimeFeatureFlagsService } from '../runtime-feature-flags/runtime-feature-flags.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastCtrl = inject(ToastController);
  private readonly debugEvents = inject(DebugEventsService);
  private readonly platformFacade = inject(PlatformFacade);
  private readonly featureFlags = inject(RuntimeFeatureFlagsService);

  private readonly token$ = new BehaviorSubject<string | null>(null);
  private listenersReady = false;

  /**
   * Set up native listeners and, if the user already opted in, re-register for
   * push so the FCM token is refreshed and token$ is populated on every launch.
   * Call once at app startup regardless of user preference.
   */
  async initializeListeners(): Promise<void> {
    if (
      this.listenersReady ||
      !this.platformFacade.isNativeSnapshot() ||
      !this.featureFlags.isPushNotificationsEnabled()
    ) {
      return;
    }

    this.listenersReady = true;

    try {
      await this.setupListeners();
    } catch (error) {
      this.listenersReady = false;
      this.debugEvents.log(
        'PushNotificationService',
        'listeners:setup_failed',
        {
          kind: 'application',
          level: 'error',
          context: {
            error: this.serializeError(error),
          },
        },
      );

      return;
    }

    // Re-register on every launch when the user has already opted in so the
    // registration event fires and token$ receives a (potentially refreshed) value.
    const pushEnabled = this.store.selectSnapshot(PreferencesState.pushEnabled);
    if (pushEnabled) {
      try {
        await PushNotifications.register();
      } catch (error) {
        this.debugEvents.log(
          'PushNotificationService',
          'register:startup_failed',
          {
            kind: 'application',
            level: 'error',
            context: {
              error: this.serializeError(error),
            },
          },
        );
      }
    }
  }

  /**
   * Request permission and register for push — call only when user opts in.
   * Returns true if permission was granted.
   */
  async requestAndRegister(): Promise<boolean> {
    if (
      !this.platformFacade.isNativeSnapshot() ||
      !this.featureFlags.isPushNotificationsEnabled()
    ) {
      return false;
    }

    try {
      await this.initializeListeners();

      const permissions = await this.ensurePermission();

      if (permissions.receive === 'granted') {
        await PushNotifications.register();
        return true;
      }
    } catch (error) {
      this.debugEvents.log(
        'PushNotificationService',
        'request_and_register:failed',
        {
          kind: 'application',
          level: 'error',
          context: {
            error: this.serializeError(error),
          },
        },
      );
    }

    return false;
  }

  /**
   * Build the payload to send to the backend, waiting up to 4s for the FCM token.
   * Returns null if push is disabled, not native, or token unavailable.
   */
  async prepareRegistrationPayload(): Promise<DeviceTokenPayload | null> {
    if (
      !this.platformFacade.isNativeSnapshot() ||
      !this.featureFlags.isPushNotificationsEnabled()
    ) {
      return null;
    }

    const pushEnabled = this.store.selectSnapshot(PreferencesState.pushEnabled);

    if (!pushEnabled) {
      return null;
    }

    await this.initializeListeners();

    let token = this.token$.getValue();

    if (!token) {
      token = await firstValueFrom(
        this.token$.pipe(
          filter(
            (value): value is string =>
              typeof value === 'string' && value.length > 0,
          ),
          timeout(4000),
          catchError(() => of(null)),
        ),
      );
    }

    if (!token) {
      return null;
    }

    return {
      deviceId: this.getOrCreateDeviceId(),
      deviceToken: token,
      platform: this.resolvePlatform(),
      osVersion: this.resolveOsVersion(),
    };
  }

  /**
   * Returns the persisted device ID from state (or null if not native).
   */
  getDeviceId(): string | null {
    if (!this.platformFacade.isNativeSnapshot()) {
      return null;
    }

    return this.store.selectSnapshot(PreferencesState.deviceId);
  }

  private async setupListeners(): Promise<void> {
    await PushNotifications.addListener('registration', (token: Token) => {
      this.token$.next(token.value);
    });

    await PushNotifications.addListener('registrationError', (error) => {
      this.debugEvents.log('PushNotificationService', 'registration:error', {
        kind: 'application',
        level: 'error',
        context: { error: error as unknown as Record<string, unknown> },
      });
    });

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        this.showForegroundToast(notification);
      },
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        this.routeFromAction(action);
      },
    );
  }

  private async ensurePermission(): Promise<PermissionStatus> {
    try {
      const current = await PushNotifications.checkPermissions();

      if (current.receive === 'prompt') {
        return PushNotifications.requestPermissions();
      }

      return current;
    } catch (error) {
      this.debugEvents.log(
        'PushNotificationService',
        'permission:check_failed',
        {
          kind: 'application',
          level: 'error',
          context: {
            error: this.serializeError(error),
          },
        },
      );

      return { receive: 'denied' } as PermissionStatus;
    }
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'object' && error !== null) {
      return error as Record<string, unknown>;
    }

    return {
      value: String(error),
    };
  }

  private async showForegroundToast(
    notification: PushNotificationSchema,
  ): Promise<void> {
    const title = notification.title ?? '';
    const body = notification.body ?? '';
    const message = title ? `${title}: ${body}` : body;

    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      position: 'top',
      color: 'dark',
      buttons: [{ icon: 'close', role: 'cancel' }],
    });

    await toast.present();
  }

  private routeFromAction(action: ActionPerformed): void {
    const data = action.notification?.data ?? {};
    const orderId =
      this.readString(data, 'order_id') ?? this.readString(data, 'orderId');

    if (orderId) {
      this.router.navigate(['/orders', orderId]);
      return;
    }

    this.router.navigate(['/orders-list']);
  }

  private getOrCreateDeviceId(): string {
    const existing = this.store.selectSnapshot(PreferencesState.deviceId);

    if (existing) {
      return existing;
    }

    const generated = this.generateDeviceId();
    this.store.dispatch(new SetDeviceId(generated));

    return generated;
  }

  private generateDeviceId(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private resolvePlatform(): 'android' | 'ios' | 'web' | 'unknown' {
    const platform = this.platformFacade.platformSnapshot();

    if (platform === 'android' || platform === 'ios' || platform === 'web') {
      return platform;
    }

    return 'unknown';
  }

  private resolveOsVersion(): string | undefined {
    if (typeof navigator === 'undefined') {
      return undefined;
    }

    // Truncate to avoid exceeding server validation limit
    return navigator.userAgent.slice(0, 512);
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = source[key];

    if (typeof value === 'string' && value.length > 0) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }

    return null;
  }
}
