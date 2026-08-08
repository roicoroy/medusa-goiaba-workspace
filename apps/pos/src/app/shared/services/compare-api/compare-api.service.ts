import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  CompareListResponse,
  CompareMessageResponse,
  Product,
} from '@org/storefront-models';

@Injectable({ providedIn: 'root' })
export class CompareApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  getCompareItems(): Observable<CompareListResponse> {
    return this.http.get<unknown>(`${this.apiBase}/compare-items`).pipe(
      map((response) => {
        const root = this.asRecord(response);
        const itemsSource = Array.isArray(response)
          ? response
          : this.asArray(root['data']);

        return {
          items: itemsSource.map((entry) =>
            this.toProduct(this.asRecord(entry)),
          ),
          message: this.toString(root['message']),
        };
      }),
    );
  }

  addProduct(productId: number): Observable<CompareMessageResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/compare-items`, {
        product_id: productId,
      })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return {
            message: this.toString(root['message']),
          };
        }),
      );
  }

  removeProduct(productId: number): Observable<CompareMessageResponse> {
    const params = new HttpParams().set('product_id', String(productId));

    return this.http
      .delete<unknown>(`${this.apiBase}/compare-items`, { params })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return {
            message: this.toString(root['message']),
          };
        }),
      );
  }

  clearAll(): Observable<CompareMessageResponse> {
    return this.http.delete<unknown>(`${this.apiBase}/compare-items/all`).pipe(
      map((response) => {
        const root = this.asRecord(response);

        return {
          message: this.toString(root['message']),
        };
      }),
    );
  }

  private toProduct(raw: Record<string, unknown>): Product {
    const prices = this.asRecord(raw['prices']);
    const baseImage = this.asRecord(raw['base_image']);
    const regular = this.asRecord(prices['regular']);
    const finalPrice = this.asRecord(prices['final']);
    const minimal = this.asRecord(prices['minimal']);
    const special = this.asRecord(prices['special']);

    return {
      id: this.toString(raw['id']) ?? '',
      numericId: this.toNumber(raw['id']) ?? undefined,
      sku: this.toString(raw['sku']),
      type: this.toString(raw['type']),
      name: this.toString(raw['name']),
      urlKey: this.toString(raw['url_key']),
      description: this.toString(raw['description']),
      baseImageUrl:
        this.toString(baseImage['medium_image_url']) ??
        this.toString(baseImage['small_image_url']) ??
        this.toString(baseImage['url']),
      minimumPrice: this.toNumber(minimal['price']),
      specialPrice: this.toNumber(special['price']) ?? null,
      isSaleable: Boolean(raw['is_saleable']),
      price:
        this.toNumber(regular['price']) ?? this.toNumber(finalPrice['price']),
      isWishlist: Boolean(raw['is_wishlist']),
      isNew: Boolean(raw['is_new']),
      brand: this.toString(raw['brand']),
      color: this.toString(raw['color']),
      size: this.toString(raw['size']),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private toString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }

    return undefined;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }
}
