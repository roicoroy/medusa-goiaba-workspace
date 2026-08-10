import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ProductVariant {
  id: string;
  title: string;
  inventory_quantity: number;
  barcode?: string;
  sku?: string;
  prices: { amount: number; currency_code: string }[];
}

export interface Product {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  variants: ProductVariant[];
}

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.MEDUSA_API_BASE_PATH}/store/products`;

  getProducts(): Observable<Product[]> {
    const urlWithFields = `${this.apiUrl}?fields=+variants.barcode,+variants.sku`;
    return this.http.get<{ products: Product[] }>(urlWithFields).pipe(
      map(response => response.products)
    );
  }
}
