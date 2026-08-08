import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactApiResponse {
  success: boolean;
  message: string;
}

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  success?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  submitContactMessage(
    payload: ContactMessage,
  ): Observable<ContactApiResponse> {
    return this.http
      .post<ApiEnvelope<unknown>>(`${this.apiBase}/contact-us`, payload)
      .pipe(
        map((response) => ({
          success: response.success ?? true,
          message:
            response.message ??
            'Thank you for contacting us. We will get back to you soon.',
        })),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            const errorPayload = this.asRecord(error.error);
            const message =
              this.asString(errorPayload['message']) ??
              error.message ??
              'Unable to submit contact form. Please try again later.';

            return throwError(() => new Error(message));
          }

          return throwError(
            () =>
              new Error(
                'Unable to submit contact form. Please try again later.',
              ),
          );
        }),
      );
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
