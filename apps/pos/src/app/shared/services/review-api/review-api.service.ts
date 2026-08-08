import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  CreateProductReviewInput,
  CustomerReviewItem,
  CustomerReviewsResponse,
  ProductReviewItem,
  ProductReviewsResponse,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

@Injectable({ providedIn: 'root' })
export class ReviewApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  getProductReviews(
    productId: number,
    page = 1,
  ): Observable<ProductReviewsResponse> {
    return this.http
      .get<unknown>(`${this.apiBase}/product/${productId}/reviews`, {
        params: { page: String(page) },
      })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const meta = this.asRecord(root['meta']);

          return {
            success: true,
            reviews: this.asArray(root['data']).map((entry) =>
              this.toProductReview(this.asRecord(entry)),
            ),
            currentPage: this.toNumber(meta['current_page']) ?? page,
            totalPages: this.toNumber(meta['last_page']) ?? 1,
            totalCount: this.toNumber(meta['total']) ?? 0,
            hasNextPage:
              (this.toNumber(meta['current_page']) ?? 1) <
              (this.toNumber(meta['last_page']) ?? 1),
          };
        }),
        catchError(
          this.handleError<ProductReviewsResponse>('getProductReviews', {
            success: false,
            message: 'Failed to fetch product reviews',
            reviews: [],
            currentPage: page,
            totalPages: 1,
            totalCount: 0,
            hasNextPage: false,
          }),
        ),
      );
  }

  submitProductReview(
    productId: number,
    input: CreateProductReviewInput,
  ): Observable<{ success: boolean; message?: string }> {
    const formData = new FormData();
    formData.append('title', input.title.trim());
    formData.append('comment', input.comment.trim());
    formData.append('rating', String(input.rating));

    if (input.name?.trim()) {
      formData.append('name', input.name.trim());
    }

    return this.http
      .post<unknown>(`${this.apiBase}/product/${productId}/review`, formData)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return {
            success: true,
            message:
              this.toString(root['message']) ?? 'Review submitted successfully',
          };
        }),
        catchError(
          this.handleError<{ success: boolean; message?: string }>(
            'submitProductReview',
            {
              success: false,
              message: 'Failed to submit review',
            },
          ),
        ),
      );
  }

  getCustomerReviews(): Observable<CustomerReviewsResponse> {
    return this.http.get<unknown>(`${this.apiBase}/customer/reviews`).pipe(
      map((response) => {
        const root = this.asRecord(response);

        return {
          success: true,
          reviews: this.asArray(root['data']).map((entry) =>
            this.toCustomerReview(this.asRecord(entry)),
          ),
        };
      }),
      catchError(
        this.handleError<CustomerReviewsResponse>('getCustomerReviews', {
          success: false,
          message: 'Failed to fetch customer reviews',
          reviews: [],
        }),
      ),
    );
  }

  private toProductReview(raw: Record<string, unknown>): ProductReviewItem {
    return {
      id: this.toString(raw['id']) ?? '',
      name: this.toString(raw['name']),
      title: this.toString(raw['title']),
      comment: this.toString(raw['comment']),
      rating: this.toNumber(raw['rating']) ?? 0,
      profile: this.toString(raw['profile']),
      createdAt: this.toString(raw['created_at']),
      images: this.asArray(raw['images']).map((entry) => {
        const item = this.asRecord(entry);

        return {
          id:
            this.toString(item['id']) ??
            this.toString(item['review_id']) ??
            undefined,
          url:
            this.toString(item['url']) ??
            this.toString(item['path']) ??
            undefined,
        };
      }),
    };
  }

  private toCustomerReview(raw: Record<string, unknown>): CustomerReviewItem {
    return {
      id: this.toString(raw['id']) ?? '',
      title: this.toString(raw['title']),
      comment: this.toString(raw['comment']),
      rating: this.toNumber(raw['rating']) ?? 0,
      status: this.toString(raw['status']),
      createdAt: this.toString(raw['created_at']),
      productId: this.toString(raw['product_id']),
      productName: this.toString(raw['product_name']),
      productUrlKey: this.toString(raw['product_url_key']),
      productImageUrl: this.toString(raw['product_image_url']),
    };
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: unknown): Observable<T> => {
      if (error instanceof HttpErrorResponse) {
        return of(result as T);
      }

      this.debugEvents.log('ReviewApiService', `${operation}:failed`, {
        kind: 'network',
        level: 'error',
        context: { error: error as Record<string, unknown> },
      });
      return of(result as T);
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
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }
}
