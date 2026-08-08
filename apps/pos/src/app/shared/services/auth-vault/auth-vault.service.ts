import { Injectable, inject } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

import { PersistedAuthSession } from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

@Injectable({ providedIn: 'root' })
export class AuthVaultService {
  private readonly debugEvents = inject(DebugEventsService);

  private static readonly AUTH_STORAGE_KEY = 'auth.tokens';
  private operationChain: Promise<void> = Promise.resolve();

  async save(session: PersistedAuthSession): Promise<void> {
    await this.runSerialized(async () => {
      try {
        await SecureStorage.set(
          AuthVaultService.AUTH_STORAGE_KEY,
          this.toStoragePayload(session),
        );
      } catch (error) {
        this.debugEvents.log('AuthVaultService', 'save:failed', {
          kind: 'application',
          level: 'error',
          context: {
            error: this.serializeError(error),
          },
        });
      }
    });
  }

  async load(): Promise<PersistedAuthSession | null> {
    const data = await this.runSerialized(async () => {
      try {
        return await SecureStorage.get(AuthVaultService.AUTH_STORAGE_KEY);
      } catch (error) {
        this.debugEvents.log('AuthVaultService', 'load:failed', {
          kind: 'application',
          level: 'warn',
          context: {
            error: this.serializeError(error),
          },
        });

        return null;
      }
    });

    if (!data || typeof data !== 'object') {
      return null;
    }

    const parsed = data as Partial<PersistedAuthSession>;
    const token = parsed.accessToken ?? parsed.token;

    if (!token || !parsed.customer) {
      return null;
    }

    return {
      customer: parsed.customer,
      token,
      accessToken: parsed.accessToken ?? token,
      apiToken: parsed.apiToken ?? parsed.customer.apiToken,
    };
  }

  async clear(): Promise<void> {
    await this.runSerialized(async () => {
      try {
        await SecureStorage.remove(AuthVaultService.AUTH_STORAGE_KEY);
      } catch (error) {
        this.debugEvents.log('AuthVaultService', 'clear:failed', {
          kind: 'application',
          level: 'warn',
          context: {
            error: this.serializeError(error),
          },
        });
      }
    });
  }

  private async runSerialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operationChain;
    let release: () => void = () => {};

    this.operationChain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  }

  private toStoragePayload(
    session: PersistedAuthSession,
  ): Record<string, unknown> {
    return {
      customer: this.toPlainObject(session.customer),
      token: session.token,
      accessToken: session.accessToken,
      apiToken: session.apiToken,
    };
  }

  private toPlainObject(value: unknown): Record<string, unknown> {
    try {
      if (!value || typeof value !== 'object') {
        return {};
      }

      return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    } catch {
      return {};
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
}
