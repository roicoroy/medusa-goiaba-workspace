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

  updateCart(cartId: string, payload: any): Observable<any> {
    return this.http.post<{ cart: any }>(`${this.apiUrl}/store/carts/${cartId}`, payload).pipe(
      map(response => response.cart)
    );
  }

  getPaymentProviders(regionId: string): Observable<any[]> {
    return this.http.get<{ payment_providers: any[] }>(`${this.apiUrl}/store/payment-providers?region_id=${regionId}`, {}).pipe(
      map(response => response.payment_providers)
    );
  }

  createPaymentCollection(cartId: string): Observable<any> {
    return this.http.post<{ payment_collection: any }>(`${this.apiUrl}/store/payment-collections`, { cart_id: cartId }).pipe(
      map(response => response.payment_collection)
    );
  }

  setPaymentSession(paymentCollectionId: string, providerId: string): Observable<any> {
    return this.http.post<{ payment_collection: any }>(`${this.apiUrl}/store/payment-collections/${paymentCollectionId}/payment-sessions`, { provider_id: providerId }).pipe(
      map(response => response.payment_collection)
    );
  }

  completeCart(cartId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/store/carts/${cartId}/complete`, {}).pipe(
      map(response => response)
    );
  }

  getShippingOptions(cartId: string): Observable<any[]> {
    return this.http.get<{ shipping_options: any[] }>(`${this.apiUrl}/store/shipping-options?cart_id=${cartId}`, {}).pipe(
      map(response => response.shipping_options)
    );
  }

  addShippingMethod(cartId: string, optionId: string): Observable<any> {
    return this.http.post<{ cart: any }>(`${this.apiUrl}/store/carts/${cartId}/shipping-methods`, { option_id: optionId }).pipe(
      map(response => response.cart)
    );
  }
}
