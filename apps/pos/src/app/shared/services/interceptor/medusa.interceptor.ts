
import { Injectable, inject } from '@angular/core';
import { HttpHandler, HttpInterceptor, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Store } from '@ngxs/store';

@Injectable({
  providedIn: 'root'
})
export class MedusaInterceptor implements HttpInterceptor {
  private store = inject(Store);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip translation files
    if (request.url.startsWith('../assets/i18n/en.json')) {
      return next.handle(request);
    }

    // Check if this is a Medusa API request
    const isMedusaRequest = this.isMedusaApiRequest(request.url);

    if (isMedusaRequest) {
      const modifiedRequest = this.medusaRequest(request);
      // SECURITY: Removed debug logging that exposed API endpoints and configuration
      return next.handle(modifiedRequest);
    }

    return next.handle(request);
  }

  private isMedusaApiRequest(url: string): boolean {
    // Check for various patterns that indicate a Medusa API request
    const isMedusa = url.includes(environment.MEDUSA_BACKEND_URL) ||
      url.includes(environment.MEDUSA_API_BASE_PATH) ||
      url.includes('localhost:9000') ||
      url.includes('/store/') ||
      url.includes('/auth/');

    // SECURITY: Removed debug logging that exposed API endpoints and backend URLs

    return isMedusa;
  }

  private medusaRequest(request: HttpRequest<any>): HttpRequest<any> {
    let headers = request.headers;

    // Set Content-Type for JSON requests, but NOT for FormData (file uploads)
    // Also skip Content-Type for OPTIONS requests (CORS preflight)
    if (!headers.has('Content-Type') && !(request.body instanceof FormData) && request.method !== 'OPTIONS') {
      headers = headers.set('Content-Type', 'application/json;charset=UTF-8');
    }
    if (!headers.has('Accept') && request.method !== 'OPTIONS') {
      headers = headers.set('Accept', 'application/json');
    }

    // Always set the publishable key if available and not already set
    // This is CRITICAL for all Medusa API requests including OPTIONS preflight
    // The browser sends OPTIONS requests automatically for CORS, and they MUST include this header
    if (environment.MEDUSA_PUBLISHABLE_KEY) {
      if (!headers.has('x-publishable-api-key')) {
        headers = headers.set('x-publishable-api-key', environment.MEDUSA_PUBLISHABLE_KEY);
      }
    } else {
      // SECURITY: Only log error in development, don't expose configuration issues in production
      if (!environment.production) {
        console.error('MEDUSA_PUBLISHABLE_KEY is not set in environment - Medusa API requests will fail!');
      }
    }

    return request.clone({
      headers,
      withCredentials: true
    });
  }
}
