import { HttpErrorResponse } from '@angular/common/http';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'http' | 'global' | 'application';

const MEDIUM_HTTP_STATUSES = new Set([400, 404, 422]);
const HIGH_HTTP_STATUSES = new Set([0, 401, 403]);

export function mapHttpErrorSeverity(status: number): ErrorSeverity {
  if (status >= 500) {
    return 'critical';
  }

  if (HIGH_HTTP_STATUSES.has(status)) {
    return 'high';
  }

  if (MEDIUM_HTTP_STATUSES.has(status)) {
    return 'medium';
  }

  return 'low';
}

export function mapRuntimeErrorSeverity(error: unknown): ErrorSeverity {
  if (error instanceof TypeError) {
    return 'high';
  }

  return 'critical';
}

export function mapHttpErrorCategory(_error: HttpErrorResponse): ErrorCategory {
  return 'http';
}

export function mapRuntimeErrorCategory(_error: unknown): ErrorCategory {
  return 'global';
}
