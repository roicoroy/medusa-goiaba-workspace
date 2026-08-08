import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import { DebugEventsService } from '../debug-events/debug-events.service';

export interface DeviceTokenPayload {
  deviceId: string;
  deviceToken: string;
  platform: 'android' | 'ios' | 'web' | 'unknown';
  appVersion?: string;
  osVersion?: string;
}

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  success?: boolean;
};

@Injectable({ providedIn: 'root' })
export class DeviceTokenApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  upsertToken(
    payload: DeviceTokenPayload,
  ): Observable<{ success: boolean; message?: string }> {
    this.debugEvents.logNetwork('DeviceTokenApiService', 'upsert:start', {
      endpoint: `${this.apiBase}/customer/device-tokens`,
      payload: {
        device_id: payload.deviceId,
        platform: payload.platform,
        app_version: payload.appVersion,
      },
    });

    return this.http
      .post<ApiEnvelope<unknown>>(`${this.apiBase}/customer/device-tokens`, {
        device_id: payload.deviceId,
        device_token: payload.deviceToken,
        platform: payload.platform,
        app_version: payload.appVersion,
        os_version: payload.osVersion,
      })
      .pipe(
        tap((response) => {
          this.debugEvents.logNetwork(
            'DeviceTokenApiService',
            'upsert:success',
            {
              success: response.success,
              message: response.message,
            },
          );
        }),
        map((response) => ({
          success: response.success ?? true,
          message: response.message,
        })),
        catchError((error) => {
          this.debugEvents.logNetwork(
            'DeviceTokenApiService',
            'upsert:error',
            {
              endpoint: `${this.apiBase}/customer/device-tokens`,
              error: this.serializeError(error),
            },
            'error',
          );

          return throwError(() => error);
        }),
      );
  }

  removeToken(
    deviceId: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http
      .request<ApiEnvelope<unknown>>(
        'delete',
        `${this.apiBase}/customer/device-tokens`,
        {
          body: {
            device_id: deviceId,
          },
        },
      )
      .pipe(
        map((response) => ({
          success: response.success ?? true,
          message: response.message,
        })),
      );
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

  removeAllTokens(): Observable<{ success: boolean; message?: string }> {
    return this.http
      .delete<
        ApiEnvelope<unknown>
      >(`${this.apiBase}/customer/device-tokens/all`)
      .pipe(
        map((response) => ({
          success: response.success ?? true,
          message: response.message,
        })),
      );
  }
}
