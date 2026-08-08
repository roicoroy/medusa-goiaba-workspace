import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  CustomerDownloadableProductsResponse,
  DownloadableProductItem,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

@Injectable({ providedIn: 'root' })
export class DownloadableProductsApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);
  private readonly accountDownloadsPath =
    '/customer/account/downloadable-products';
  private readonly ajaxHeaders = new HttpHeaders({
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  });

  private get accountDownloadsUrl(): string {
    if (Capacitor.isNativePlatform()) {
      return `${this.apiConfig.backendOrigin}${this.accountDownloadsPath}`;
    }

    return this.accountDownloadsPath;
  }

  getCustomerDownloadableProducts(): Observable<CustomerDownloadableProductsResponse> {
    return this.http
      .get<unknown>(this.accountDownloadsUrl, {
        headers: this.ajaxHeaders,
        params: {
          'pagination[page]': '1',
          'pagination[per_page]': '100',
          'sort[column]': 'created_at',
          'sort[order]': 'desc',
        },
      })
      .pipe(
        map((response) => this.toDownloadableProductsResponse(response)),
        catchError((error) => {
          if (this.isFeatureUnavailable(error)) {
            this.debugEvents.log(
              'DownloadableProductsApiService',
              'getCustomerDownloadableProducts:feature-unavailable',
              {
                kind: 'network',
                level: 'warn',
                context: this.toErrorContext(error),
              },
            );

            return of({
              success: true,
              message:
                'Downloadable products are not available on this server.',
              downloads: [],
            });
          }

          return this.handleError<CustomerDownloadableProductsResponse>(
            'getCustomerDownloadableProducts',
            {
              success: false,
              message: 'Failed to fetch downloadable products',
              downloads: [],
            },
          )(error);
        }),
      );
  }

  buildDownloadUrl(downloadId: string): string {
    const downloadPath = `${this.accountDownloadsPath}/download/${encodeURIComponent(downloadId)}`;

    if (Capacitor.isNativePlatform()) {
      return `${this.apiConfig.backendOrigin}${downloadPath}`;
    }

    return downloadPath;
  }

  private toDownloadableProductsResponse(
    response: unknown,
  ): CustomerDownloadableProductsResponse {
    const root = this.asRecord(response);
    const records = this.asCollection(root);

    return {
      success: true,
      message: this.toString(root['message']),
      downloads: records.map((entry) =>
        this.toDownloadableProductItem(this.asRecord(entry)),
      ),
    };
  }

  private toDownloadableProductItem(
    raw: Record<string, unknown>,
  ): DownloadableProductItem {
    const order = this.asRecord(raw['order']);
    const downloadBought = this.toNumber(raw['download_bought']);
    const downloadUsed = this.toNumber(raw['download_used']) ?? 0;
    const downloadCanceled = this.toNumber(raw['download_canceled']) ?? 0;
    const remainingDownloads =
      typeof downloadBought === 'number'
        ? Math.max(downloadBought - downloadUsed - downloadCanceled, 0)
        : null;
    const rawTitle =
      this.toString(raw['title']) ??
      this.toString(raw['name']) ??
      this.toString(raw['product_name']);
    const rawStatus = this.toString(raw['status']);
    const sourceUrl = this.resolveDownloadUrl(
      this.extractHref(this.toString(raw['product_name'])) ??
        this.toString(raw['download_url']) ??
        this.toString(raw['url']) ??
        this.toString(raw['file_url']),
    );
    const id = this.toString(raw['id']) ?? '';

    return {
      id,
      orderId: this.toString(raw['order_id']) ?? this.toString(order['id']),
      orderItemId: this.toString(raw['order_item_id']),
      orderIncrementId:
        this.toString(raw['increment_id']) ??
        this.toString(order['increment_id']),
      productName: this.stripHtml(rawTitle) || 'Downloadable product',
      title: this.stripHtml(rawTitle) || 'Download',
      type: this.toString(raw['type']),
      status: this.normalizeStatus(rawStatus, raw),
      downloadBought,
      downloadUsed,
      downloadCanceled,
      remainingDownloads,
      createdAt: this.toString(raw['created_at']),
      fileName: this.toString(raw['file_name']),
      filePath: this.toString(raw['file']),
      sourceUrl,
      directDownloadUrl:
        sourceUrl ?? (id ? this.buildDownloadUrl(id) : undefined),
    };
  }

  private asCollection(root: Record<string, unknown>): unknown[] {
    const candidates = [
      root['records'],
      root['data'],
      root['items'],
      root['member'],
      root['hydra:member'],
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: unknown): Observable<T> => {
      if (!(error instanceof HttpErrorResponse)) {
        this.debugEvents.log(
          'DownloadableProductsApiService',
          `${operation}:failed`,
          {
            kind: 'network',
            level: 'error',
            context: this.toErrorContext(error),
          },
        );
      }

      return of(result as T);
    };
  }

  private toErrorContext(error: unknown): Record<string, unknown> {
    if (error instanceof HttpErrorResponse) {
      return {
        status: error.status,
        message: error.message,
        url: error.url,
        error: this.asRecord(error.error),
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
      };
    }

    return { error: error as object };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
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

  private stripHtml(value: string | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractHref(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const match = value.match(/href=["']([^"']+)["']/i);

    return match?.[1];
  }

  private normalizeStatus(
    value: string | undefined,
    raw: Record<string, unknown>,
  ): DownloadableProductItem['status'] {
    const normalized = this.stripHtml(value).toLowerCase();

    if (normalized.includes('available')) {
      return 'available';
    }

    if (normalized.includes('expired')) {
      return 'expired';
    }

    if (normalized.includes('pending')) {
      return 'pending';
    }

    const invoiceState = this.toString(raw['invoice_state'])?.toLowerCase();

    if (invoiceState === 'paid') {
      return 'available';
    }

    return 'pending';
  }

  private isFeatureUnavailable(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    return error.status === 404;
  }

  private resolveDownloadUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }

    if (url.startsWith('data:')) {
      return url;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${this.apiConfig.backendOrigin}${normalizedPath}`;
  }
}
