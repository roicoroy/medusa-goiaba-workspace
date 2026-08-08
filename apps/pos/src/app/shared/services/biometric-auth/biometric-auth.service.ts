import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

import { DebugEventsService } from '../debug-events/debug-events.service';
import { RuntimeFeatureFlagsService } from '../runtime-feature-flags/runtime-feature-flags.service';

export type BiometricCapability = {
  available: boolean;
  platform: 'android' | 'web' | 'other';
  reason?:
    | 'disabled_by_config'
    | 'not_native'
    | 'not_enrolled'
    | 'not_supported'
    | 'error';
};

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private readonly debugEvents = inject(DebugEventsService);
  private readonly featureFlags = inject(RuntimeFeatureFlagsService);

  isEnabledByConfig(): boolean {
    return this.featureFlags.isBiometricsEnabled();
  }

  async getCapability(): Promise<BiometricCapability> {
    if (!this.isEnabledByConfig()) {
      return {
        available: false,
        platform: this.resolvePlatform(),
        reason: 'disabled_by_config',
      };
    }

    const platform = this.resolvePlatform();

    if (platform === 'android') {
      try {
        const result = await BiometricAuth.checkBiometry();

        return {
          available: !!result.isAvailable,
          platform,
          reason: result.isAvailable ? undefined : 'not_enrolled',
        };
      } catch (error) {
        this.debugEvents.log(
          'BiometricAuthService',
          'capability:android:error',
          {
            kind: 'application',
            level: 'warn',
            context: { error: this.serializeError(error) },
          },
        );

        return { available: false, platform, reason: 'error' };
      }
    }

    if (platform === 'web') {
      try {
        const supported =
          typeof window !== 'undefined' &&
          typeof PublicKeyCredential !== 'undefined' &&
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
            'function' &&
          (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());

        return {
          available: !!supported,
          platform,
          reason: supported ? undefined : 'not_supported',
        };
      } catch {
        return { available: false, platform, reason: 'not_supported' };
      }
    }

    return { available: false, platform, reason: 'not_native' };
  }

  async authenticateForSessionUnlock(options?: {
    reason?: string;
  }): Promise<boolean> {
    const capability = await this.getCapability();

    if (!capability.available) {
      return false;
    }

    if (capability.platform === 'android') {
      try {
        await BiometricAuth.authenticate({
          reason: options?.reason ?? 'Use biometrics to unlock your session',
          cancelTitle: 'Cancel',
          allowDeviceCredential: true,
        });

        return true;
      } catch (error) {
        this.debugEvents.log(
          'BiometricAuthService',
          'authenticate:android:failed',
          {
            kind: 'application',
            level: 'warn',
            context: { error: this.serializeError(error) },
          },
        );

        return false;
      }
    }

    // Web passkeys will require server challenge/verification in Phase 2.
    return false;
  }

  private resolvePlatform(): 'android' | 'web' | 'other' {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      return 'android';
    }

    if (platform === 'web') {
      return 'web';
    }

    return 'other';
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
}
