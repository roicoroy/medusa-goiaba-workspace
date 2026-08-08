import { Injectable } from '@angular/core';

type RuntimeFeatureFlags = {
  biometrics?: boolean;
  pushNotifications?: boolean;
};

type RuntimeConfig = {
  featureFlags?: RuntimeFeatureFlags;
};

@Injectable({ providedIn: 'root' })
export class RuntimeFeatureFlagsService {
  private readonly runtimeConfig = this.readRuntimeConfig();

  isBiometricsEnabled(): boolean {
    return this.runtimeConfig.featureFlags?.biometrics !== false;
  }

  isPushNotificationsEnabled(): boolean {
    return this.runtimeConfig.featureFlags?.pushNotifications !== false;
  }

  private readRuntimeConfig(): RuntimeConfig {
    const globalObject = globalThis as typeof globalThis & {
      __GOIABA_RUNTIME_CONFIG__?: RuntimeConfig;
    };

    const config = globalObject.__GOIABA_RUNTIME_CONFIG__;

    return config && typeof config === 'object' ? config : {};
  }
}
