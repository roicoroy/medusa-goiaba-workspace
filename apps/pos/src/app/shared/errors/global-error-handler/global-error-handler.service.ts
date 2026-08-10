import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Store } from '@ngxs/store';
import { DialogService } from '../../services/dialog/dialog.service';
import { DebugEventsService } from '../../services/debug-events/debug-events.service';
import {
  mapRuntimeErrorCategory,
  mapRuntimeErrorSeverity,
} from '../logging-policy.helper';
import { environment } from '../../../../environments/environment';

const LOGTAG = '[GlobalErrorHandlerService]';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandlerService implements ErrorHandler {
  private injector = inject(Injector);
  private store = inject(Store);
  private debugEvents = inject(DebugEventsService);

  public handleError(error: unknown): void {
    this.handle(error);
  }

  private async handle(error: unknown): Promise<void> {
    try {
      const isHttpError = error instanceof HttpErrorResponse;
      const message = this.getMessageFromUnknownError(error);

      // Log error to ErrorState (only if enabled)
      this.logErrorToState(error, message);

      // HTTP failures are already logged in ErrorInterceptor; avoid duplicate runtime noise.
      if (!isHttpError) {
        this.debugEvents.log('GlobalErrorHandlerService', 'runtime:error', {
          kind: 'application',
          level: 'error',
          context: {
            message,
            isHttpError,
          },
          echoToConsole: !environment.production,
        });
      }

      // Safely show error alert with timeout to prevent cascading failures
      await this.showErrorAlert(message);
    } catch (errorHandlerError) {
      this.debugEvents.log(
        'GlobalErrorHandlerService',
        'handler:internal-error',
        {
          kind: 'application',
          level: 'error',
          context: {
            logTag: LOGTAG,
            error: errorHandlerError as Record<string, unknown>,
          },
          echoToConsole: !environment.production,
        },
      );
      // Don't re-throw - log and continue
    }
  }

  /**
   * Safely show error alert with fallback handling
   */
  private async showErrorAlert(message: string): Promise<void> {
    try {
      const dialogService: DialogService =
        this.injector.get<DialogService>(DialogService);
      const alertPromise = dialogService.showErrorAlert({ message });

      // Add timeout to prevent eternal waiting if dialog has issues
      const timeoutPromise = new Promise<void>((resolve) =>
        setTimeout(() => resolve(), 5000),
      );

      await Promise.race([alertPromise, timeoutPromise]);
    } catch (dialogError) {
      this.debugEvents.log(
        'GlobalErrorHandlerService',
        'dialog:show-error-alert:failed',
        {
          kind: 'application',
          level: 'error',
          context: {
            logTag: LOGTAG,
            dialogError: dialogError as Record<string, unknown>,
            originalMessage: message,
          },
          echoToConsole: !environment.production,
        },
      );
    }
  }
  private logErrorToState(error: unknown, message: string): void {
    // Skip HTTP errors - they're already logged by ErrorInterceptor
    if (error instanceof HttpErrorResponse) {
      return;
    }

    const errorLoggingConfig = environment.errorLogging || {
      enabled: !environment.production,
    };

    // Only log if enabled
    if (!errorLoggingConfig.enabled) {
      return;
    }

    // Extract stack trace (limit in state will truncate if needed)
    let stack: string | undefined;
    if (error instanceof Error && error.stack) {
      stack = error.stack;
    } else if (error && typeof error === 'object' && 'stack' in error) {
      stack = String((error as any).stack);
    }

    const severity = mapRuntimeErrorSeverity(error);

    // Dispatch to ErrorState
    /*
    this.store.dispatch(
      new ErrorActions.LogError({
        type: mapRuntimeErrorCategory(error),
        severity,
        message,
        stack,
        timestamp: new Date().toISOString(),
      }),
    );
    */
  }

  private getMessageFromUnknownError(error: any): string {
    let message = 'An unknown error has occurred....';

    if (error instanceof HttpErrorResponse) {
      if (error.status >= 500) {
        return 'Server is experiencing technical difficulties. Please try again shortly.';
      }

      if (error.status === 0) {
        return 'Unable to connect to the server. Please check your connection and try again.';
      }

      if (error.status === 401) {
        return 'Your session has expired. Please sign in again.';
      }

      if (error.status === 403) {
        return 'You do not have permission to perform this action.';
      }

      if (error.status === 404) {
        return 'Requested resource was not found.';
      }

      if (error.status === 422) {
        return (
          error.error?.message ||
          'Some fields are invalid. Please review and try again.'
        );
      }
    }

    if (error instanceof Object && 'rejection' in error) {
      error = (error as any).rejection;
    }
    if (error instanceof Error && error.message) {
      message = error.message;
    }
    if (error.status === 401 && error.name === 'HttpErrorResponse') {
      message = error.error;
    }
    const myErr: any = error;
    if (myErr?.error?.message) {
      message = myErr.error.message;
    }
    return message;
  }
}
