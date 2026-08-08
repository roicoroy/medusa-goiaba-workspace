import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.MEDUSA_API_BASE_PATH}/store/carts`;

  createCart(payload: { email?: string; items?: { variant_id: string; quantity: number }[] } = {}): Observable<any> {
    return this.http.post<{ cart: any }>(this.apiUrl, payload).pipe(
      map(response => response.cart)
    );
  }

  // We can add methods to add items to cart, complete cart, etc., as we progress the POS features
}
