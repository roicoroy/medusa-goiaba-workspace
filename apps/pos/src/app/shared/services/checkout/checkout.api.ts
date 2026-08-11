import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.MEDUSA_API_BASE_PATH;

  getRegions(): Observable<any[]> {
    return this.http.get<{ regions: any[] }>(`${this.apiUrl}/store/regions`).pipe(
      map(response => response.regions)
    );
  }

  updateCart(cartId: string, payload: { region_id?: string; email?: string }): Observable<any> {
    return this.http.post<{ cart: any }>(`${this.apiUrl}/store/carts/${cartId}`, payload).pipe(
      map(response => response.cart)
    );
  }

  createPaymentSessions(cartId: string): Observable<any> {
    return this.http.post<{ cart: any }>(`${this.apiUrl}/store/carts/${cartId}/payment-sessions`, {}).pipe(
      map(response => response.cart)
    );
  }

  setPaymentSession(cartId: string, providerId: string): Observable<any> {
    return this.http.post<{ cart: any }>(`${this.apiUrl}/store/carts/${cartId}/payment-session`, { provider_id: providerId }).pipe(
      map(response => response.cart)
    );
  }

  completeCart(cartId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/store/carts/${cartId}/complete`, {}).pipe(
      map(response => response)
    );
  }
}
