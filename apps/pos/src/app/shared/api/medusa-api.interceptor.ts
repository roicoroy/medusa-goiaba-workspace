import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { AuthState } from '../../store/auth/auth.state';
import { environment } from '../../../environments/environment';

@Injectable()
export class MedusaApiInterceptor implements HttpInterceptor {
  private readonly store = inject(Store);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authData = this.store.selectSnapshot(AuthState.getAuthData);
    const token = authData?.token;
    
    let headers = req.headers;
    
    // Always append the publishable API key for Medusa Storefront endpoints
    if (environment.MEDUSA_PUBLISHABLE_KEY) {
      headers = headers.set('x-publishable-api-key', environment.MEDUSA_PUBLISHABLE_KEY);
    }

    // Attach Admin Bearer token if we have one and are making a request
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    const request = req.clone({ headers });

    return next.handle(request);
  }
}
