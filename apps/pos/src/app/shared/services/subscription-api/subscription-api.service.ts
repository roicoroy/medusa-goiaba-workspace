import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import { DebugEventsService } from '../debug-events/debug-events.service';

export type SubscriptionResult = {
  success: boolean;
  message: string;
  alreadySubscribed?: boolean;
};

@Injectable({ providedIn: 'root' })
export class SubscriptionApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  subscribe(email: string): Observable<SubscriptionResult> {
    return this.http
      .post<unknown>(`${this.apiConfig.shopApiBase}/newsletters`, {
        customerEmail: email,
      })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return {
            success: true,
            message:
              this.toString(root['message']) ??
              'Subscription saved successfully.',
            alreadySubscribed: Boolean(root['already_subscribed']),
          } satisfies SubscriptionResult;
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            const payload = this.asRecord(error.error);

            return of({
              success: false,
              message:
                this.firstValidationMessage(payload) ??
                this.toString(payload['message']) ??
                'Could not subscribe right now.',
            } satisfies SubscriptionResult);
          }

          this.debugEvents.log('SubscriptionApiService', 'subscribe:failed', {
            kind: 'network',
            level: 'error',
            context: { error: error as Record<string, unknown> },
          });

          return of({
            success: false,
            message: 'Could not subscribe right now.',
          } satisfies SubscriptionResult);
        }),
      );
  }

  private firstValidationMessage(
    payload: Record<string, unknown>,
  ): string | undefined {
    const errors = this.asRecord(payload['errors']);
    const firstField = Object.values(errors)[0];

    if (Array.isArray(firstField) && typeof firstField[0] === 'string') {
      return firstField[0];
    }

    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private toString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
