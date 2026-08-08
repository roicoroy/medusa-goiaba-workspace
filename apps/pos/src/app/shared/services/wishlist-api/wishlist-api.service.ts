import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  WishlistListResponse,
  WishlistMessageResponse,
  WishlistItem,
  Product,
} from '@org/storefront-models';

@Injectable({ providedIn: 'root' })
export class WishlistApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  getWishlist(): Observable<WishlistListResponse> {
    return this.http.get<unknown>(`${this.apiBase}/customer/wishlist`).pipe(
      map((response) => {
        const root = this.asRecord(response);

        return {
          items: this.asArray(root['data']).map((entry) =>
            this.toWishlistItem(this.asRecord(entry)),
          ),
        };
      }),
    );
  }

  toggleProduct(productId: number): Observable<WishlistMessageResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/customer/wishlist`, {
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

  removeItem(itemId: number): Observable<WishlistMessageResponse> {
    return this.http
      .delete<unknown>(`${this.apiBase}/customer/wishlist/${itemId}`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return {
            message: this.toString(root['message']),
          };
        }),
      );
  }

  clearAll(): Observable<WishlistMessageResponse> {
    return this.http
      .delete<unknown>(`${this.apiBase}/customer/wishlist/all`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return {
            message: this.toString(root['message']),
          };
        }),
      );
  }

  private toWishlistItem(raw: Record<string, unknown>): WishlistItem {
    const numericId = this.toNumber(raw['id']);

    return {
      id: this.toString(raw['id']) ?? '',
      numericId: numericId ?? undefined,
      product: this.toProduct(this.asRecord(raw['product'])),
    };
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
      isOptionsRequired: Boolean(raw['is_options_required']),
      price:
        this.toNumber(regular['price']) ?? this.toNumber(finalPrice['price']),
      isWishlist: true,
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
