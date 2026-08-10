import { Injectable, inject } from '@angular/core';
import { HttpHandler, HttpInterceptor, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { AuthActions } from 'src/app/store/auth/auth.actions';
import { AuthState } from 'src/app/store/auth/auth.state';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
  private store = inject(Store);
  private router = inject(Router);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.store.selectSnapshot(AuthState.getToken);
    if (token) {
      request = this.addTokenToRequest(request, token);
    }
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const isLoggedIn = this.store.selectSnapshot(AuthState.isLoggedIn);

          if (!isLoggedIn) {
            // User is not logged in, navigate to auth page
            const currentUrl = this.router.url;
            if (!currentUrl.startsWith('/auth') && !currentUrl.startsWith('/login') && !currentUrl.startsWith('/register')) {
              this.router.navigate(['/auth'], { queryParams: { returnUrl: currentUrl } });
            }
          } else {
            // User is logged in but token might be expired, try to refresh session
            return this.handleTokenRefresh(request, next);
          }
        }

        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  }

  private handleTokenRefresh(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.store.dispatch(new AuthActions.GetSession()).pipe(
      switchMap(() => {
        const token = this.store.selectSnapshot(AuthState.getToken);
        const isLoggedIn = this.store.selectSnapshot(AuthState.isLoggedIn);

        if (token) {
          request = this.addTokenToRequest(request, token);
          return next.handle(request);
        } else if (isLoggedIn) {
          // If we are logged in but have no token, we might be using session cookies.
          // Retry the request without the Bearer token.
          return next.handle(request);
        } else {
          // Session refresh failed, logout and redirect to auth
          this.store.dispatch(new AuthActions.AuthLogout());
          const currentUrl = this.router.url;
          if (!currentUrl.startsWith('/auth') && !currentUrl.startsWith('/login') && !currentUrl.startsWith('/register')) {
            this.router.navigate(['/auth'], { queryParams: { returnUrl: currentUrl } });
          }
          return throwError(() => new Error('Authentication failed'));
        }
      }),
      catchError((error) => {
        // Session refresh failed, logout and redirect to auth
        this.store.dispatch(new AuthActions.AuthLogout());
        const currentUrl = this.router.url;
        if (!currentUrl.startsWith('/auth') && !currentUrl.startsWith('/login') && !currentUrl.startsWith('/register')) {
          this.router.navigate(['/auth'], { queryParams: { returnUrl: currentUrl } });
        }
        return throwError(() => error);
      })
    );
  }
}
