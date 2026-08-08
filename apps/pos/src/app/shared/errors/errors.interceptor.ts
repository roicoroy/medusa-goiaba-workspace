import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { GlobalErrorHandlerService } from './global-error-handler/global-error-handler.service';
import { DialogService } from '../services/dialog/dialog.service';
import { NavigationService } from '../services/navigation/navigation.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Logout } from 'src/app/store/auth/auth.actions';
import { AuthState } from 'src/app/store/auth/auth.state';
import { ErrorActions } from 'src/app/store/errors/errors.actions';
import { DebugEventsService } from '../services/debug-events/debug-events.service';
import { environment } from 'src/environments/environment';
import {
  mapHttpErrorCategory,
  mapHttpErrorSeverity,
} from './logging-policy.helper';

@Injectable({
  providedIn: 'root',
})
export class ErrorInterceptor implements HttpInterceptor {
  private store = inject(Store);
  private globalErrors = inject(GlobalErrorHandlerService);
  private dialog = inject(DialogService);
  private nav = inject(NavigationService);
  private debugEvents = inject(DebugEventsService);
  private authRedirectInFlight = false;
  private logoutInFlight = false;

  // URLs that should not trigger automatic error handling
  private readonly skipErrorHandling = ['/auth/session', '/auth/token/refresh'];

  // URLs that should show less intrusive error handling for network issues
  private readonly silentNetworkErrorUrls = [
    '/store/products',
    '/store/customers/me/wishlists',
    '/store/wishlist',
    '/store/return-reasons',
    '/store/returns',
  ];

  // URLs that need special error handling for server issues
  private readonly criticalErrorUrls = ['/store/carts'];

  // URLs for endpoints that are optional and can fail gracefully (not yet implemented on backend)
  // Also includes endpoints where 404 is expected business logic (e.g., empty wishlist)
  private readonly optionalEndpoints = [
    '/api/shop/page_translations',
    '/store/products-bought-together',
    '/store/product-reviews',
    '/store/customers/me/wishlists',
    '/store/wishlist',
    '/customer/account/downloadable-products',
    '/customer/profile',
    '/product-downloadable-links',
    '/shop/product-downloadable-links',
  ];

  // Endpoints that require an authenticated customer session.
  private readonly authRequiredEndpoints = [
    '/compare-items',
    '/customer/profile',
    '/customer/orders',
    '/customer/reviews',
    '/customer/wishlist',
    '/customer/addresses',
    '/customer/account/downloadable-products',
    '/customer/device-tokens',
    '/checkout/onepage',
  ];

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Skip error handling for certain endpoints
        if (this.shouldSkipErrorHandling(request.url)) {
          return throwError(() => error);
        }

        this.handleHttpError(request, error);
        return throwError(() => error);
      }),
    );
  }

  private shouldSkipErrorHandling(url: string): boolean {
    return this.skipErrorHandling.some((skipUrl) => url.includes(skipUrl));
  }

  private isOptionalEndpoint(url: string): boolean {
    return this.optionalEndpoints.some((optionalUrl) =>
      url.includes(optionalUrl),
    );
  }

  private isAuthRequiredRequest(request: HttpRequest<unknown>): boolean {
    const url = request.url || '';

    if (
      this.authRequiredEndpoints.some((protectedUrl) =>
        url.includes(protectedUrl),
      )
    ) {
      return true;
    }

    return false;
  }

  private handleHttpError(
    request: HttpRequest<unknown>,
    error: HttpErrorResponse,
  ): void {
    // Angular can surface parsing/protocol issues as HttpErrorResponse even
    // when the HTTP status is successful (2xx). Treat these as non-fatal
    // diagnostics so successful flows (e.g. login) are not shown as failures.
    if (error.status >= 200 && error.status < 300) {
      this.debugEvents.log('ErrorInterceptor', 'http:nonfatal:2xx-error', {
        kind: 'network',
        level: 'warn',
        context: {
          status: error.status,
          statusText: error.statusText,
          url: error.url || undefined,
          message: error.message,
        },
        echoToConsole: !environment.production,
      });

      return;
    }

    const isLoggedIn = !!this.store.selectSnapshot(AuthState.isAuthenticated);
    const url = error.url || '';
    const isCriticalError = this.criticalErrorUrls.some((criticalUrl) =>
      url.includes(criticalUrl),
    );
    const isOptional = this.isOptionalEndpoint(url);
    const requiresAuthentication = this.isAuthRequiredRequest(request);

    // Log error to ErrorState (if enabled and meets threshold)
    this.logErrorToState(request, error, isLoggedIn, requiresAuthentication);
    this.debugEvents.log('ErrorInterceptor', 'http:error', {
      kind: 'network',
      level: 'debug',
      context: {
        status: error.status,
        url: error.url || undefined,
        message: error.message,
        isCriticalError,
        isOptional,
        requiresAuthentication,
      },
      echoToConsole: false,
    });

    switch (error.status) {
      case 0:
        // Network connectivity issues - server offline, CORS, or connection refused
        this.handleNetworkError(error);
        break;

      case 400:
        this.globalErrors.handleError(error);
        this.debugEvents.log('ErrorInterceptor', 'http:400', {
          kind: 'network',
          level: 'warn',
          context: { message: error.error?.message || 'Invalid request' },
          echoToConsole: !environment.production,
        });
        break;

      case 401:
        if (!isLoggedIn && requiresAuthentication) {
          this.handleGuestAuthenticationRequired(request);
          break;
        }

        // Optional endpoints always fail silently — never log the user out for best-effort calls.
        if (isOptional) {
          this.debugEvents.log('ErrorInterceptor', 'http:401:optional', {
            kind: 'network',
            level: 'debug',
            context: { url, isLoggedIn },
            echoToConsole: !environment.production,
          });
          break;
        }

        if (!isLoggedIn) {
          this.globalErrors.handleError(error);
        } else if (!this.logoutInFlight) {
          // Non-optional endpoint returned 401 while authenticated — token expired.
          // Guard against duplicate Logout dispatches from concurrent requests.
          this.logoutInFlight = true;
          this.globalErrors.handleError(error);
          this.store.dispatch(new Logout());
          setTimeout(() => {
            this.logoutInFlight = false;
          }, 3000);
        }
        break;

      case 403:
        this.globalErrors.handleError(error);
        this.debugEvents.log('ErrorInterceptor', 'http:403', {
          kind: 'network',
          level: 'warn',
          context: { message: 'Forbidden: Access denied' },
          echoToConsole: !environment.production,
        });
        break;

      case 404:
        // For optional endpoints, skip global error handling (no alerts, no error dialogs)
        if (isOptional) {
          // Still log in development for debugging
          this.debugEvents.log('ErrorInterceptor', 'http:404:optional', {
            kind: 'network',
            level: 'debug',
            context: { url },
            echoToConsole: !environment.production,
          });
        } else {
          this.globalErrors.handleError(error);
          this.debugEvents.log('ErrorInterceptor', 'http:404', {
            kind: 'network',
            level: 'warn',
            context: { message: 'Not Found: Resource not found' },
            echoToConsole: !environment.production,
          });
        }
        break;

      case 422:
        this.globalErrors.handleError(error);
        this.debugEvents.log('ErrorInterceptor', 'http:422', {
          kind: 'network',
          level: 'warn',
          context: { message: 'Validation Error: Invalid data' },
          echoToConsole: !environment.production,
        });
        break;

      case 429:
        this.globalErrors.handleError(error);
        this.debugEvents.log('ErrorInterceptor', 'http:429', {
          kind: 'network',
          level: 'warn',
          context: {
            message: 'Too Many Requests: Please slow down your requests',
          },
          echoToConsole: !environment.production,
        });
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Always use sanitized 5xx handling here to avoid leaking backend internals.
        this.handleCriticalServerError(error);
        break;

      default:
        this.globalErrors.handleError(error);
        this.debugEvents.log('ErrorInterceptor', 'http:unknown', {
          kind: 'network',
          level: 'error',
          context: {
            status: error.status,
            statusText: error.statusText,
            url: error.url || undefined,
            message: error.error?.message || error.message || 'Unknown error',
          },
          echoToConsole: !environment.production,
        });
        break;
    }
  }

  private handleNetworkError(error: HttpErrorResponse): void {
    const url = error.url || 'unknown endpoint';
    let userMessage = 'Unable to connect to the server';

    // Check if this is an optional endpoint (likely CORS issue from missing endpoint)
    const isOptional = this.isOptionalEndpoint(url);

    // Check if this should be a silent network error (less intrusive)
    const isSilentError = this.silentNetworkErrorUrls.some((silentUrl) =>
      url.includes(silentUrl),
    );

    // Get user-friendly network message
    userMessage = this.getNetworkErrorMessage(error);

    // For optional endpoints with status 0, treat as graceful failure (skip alert)
    // This handles CORS errors when backend doesn't send CORS headers for 404s
    if (isOptional) {
      // Still log in development for debugging
      this.debugEvents.log('ErrorInterceptor', 'http:network:optional', {
        kind: 'network',
        level: 'debug',
        context: {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
        },
        echoToConsole: !environment.production,
      });
      // Skip alert for optional endpoints - treat as graceful failure
      return;
    }

    // Only show alert for non-silent errors or critical endpoints
    if (!isSilentError) {
      this.presentAlert(userMessage);
    }

    this.debugEvents.log('ErrorInterceptor', 'http:network:connectivity', {
      kind: 'network',
      level: 'error',
      context: {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        message: error.message,
        isSilentError,
        isOnline: this.isOnline(),
      },
      echoToConsole: !environment.production,
    });
  }

  private handleCriticalServerError(error: HttpErrorResponse): void {
    const url = error.url || 'unknown endpoint';
    let userMessage = 'Server is experiencing technical difficulties';

    // Provide specific messages for different critical operations
    if (url.includes('/store/carts')) {
      userMessage =
        'Unable to create or update cart due to server issues. Please try again in a few moments.';
    } else if (url.includes('/store/orders')) {
      userMessage =
        'Unable to process order due to server issues. Please try again later.';
    } else if (url.includes('/store/payment')) {
      userMessage =
        'Payment processing is currently unavailable. Please try again later.';
    }

    // Show user-friendly error message for critical operations
    this.presentAlert(userMessage);

    this.debugEvents.log('ErrorInterceptor', 'http:critical:server', {
      kind: 'network',
      level: 'error',
      context: {
        status: error.status,
        statusText: error.statusText,
        message: 'Server error occurred',
      },
      echoToConsole: !environment.production,
    });
  }

  /**
   * Log HTTP error to ErrorState
   * Only logs errors that meet severity threshold and are not skipped
   */
  private logErrorToState(
    request: HttpRequest<unknown>,
    error: HttpErrorResponse,
    isLoggedIn: boolean,
    requiresAuthentication: boolean,
  ): void {
    // Skip pseudo-errors reported with successful HTTP status.
    if (error.status >= 200 && error.status < 300) {
      return;
    }

    // Skip optional endpoints (404s are expected business logic)
    if (this.isOptionalEndpoint(error.url || '')) {
      return;
    }

    // Guest users hitting a protected endpoint should be redirected, not recorded as app errors.
    if (
      !isLoggedIn &&
      error.status === 401 &&
      requiresAuthentication &&
      this.isAuthRequiredRequest(request)
    ) {
      return;
    }

    // Skip if error handling should be skipped
    if (this.shouldSkipErrorHandling(error.url || '')) {
      return;
    }

    // Determine severity using shared logging policy.
    const severity = mapHttpErrorSeverity(error.status);

    // Get sanitized error message
    const errorMessage = error.error?.message || error.message || 'HTTP Error';
    const userMessage = this.getUserFriendlyMessage(error);

    // Dispatch to ErrorState
    this.store.dispatch(
      new ErrorActions.LogError({
        type: mapHttpErrorCategory(error),
        severity,
        status: error.status,
        message: errorMessage,
        url: error.url || undefined,
        userMessage,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An error occurred';
  }

  private presentAlert(message: string): void {
    void this.dialog.showErrorAlert({
      header: 'Error',
      message,
      buttons: ['OK'],
    });
  }

  private handleGuestAuthenticationRequired(
    request: HttpRequest<unknown>,
  ): void {
    const message = this.getAuthenticationRequiredMessage(request);

    this.debugEvents.log('ErrorInterceptor', 'auth:required:guest', {
      kind: 'navigation',
      level: 'info',
      context: {
        url: request.url,
        method: request.method,
        message,
      },
      echoToConsole: !environment.production,
    });

    if (this.authRedirectInFlight) {
      return;
    }

    this.authRedirectInFlight = true;

    this.presentAlert(message);
    void this.nav.navigateRoot('/login');

    setTimeout(() => {
      this.authRedirectInFlight = false;
    }, 1000);
  }

  private getAuthenticationRequiredMessage(
    request: HttpRequest<unknown>,
  ): string {
    const url = request.url || '';

    if (
      /\/product\/\d+\/review$/i.test(url) &&
      request.method.toUpperCase() === 'POST'
    ) {
      return 'Please sign in to submit a review.';
    }

    if (url.includes('/customer/wishlist')) {
      return 'Please sign in to manage your wishlist.';
    }

    if (url.includes('/compare-items')) {
      return 'Please sign in to manage compare items.';
    }

    if (url.includes('/customer/orders')) {
      return 'Please sign in to view your orders.';
    }

    if (url.includes('/customer/reviews')) {
      return 'Please sign in to view your reviews.';
    }

    if (url.includes('/checkout/onepage')) {
      return 'Please sign in to continue with checkout.';
    }

    return 'Please sign in to continue.';
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private getNetworkErrorMessage(error: HttpErrorResponse): string {
    if (!this.isOnline()) {
      return 'No internet connection. Please check your network and try again.';
    }

    if (error.status === 0) {
      return 'Unable to connect to the server. Please try again in a moment.';
    }

    return 'Network request failed. Please try again.';
  }
}
