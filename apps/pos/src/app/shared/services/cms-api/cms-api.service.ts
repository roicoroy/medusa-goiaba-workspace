import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { CmsPageDetail, CmsPageSummary } from '@org/storefront-models';
import { BagistoApiConfigService } from '../../api/api-base-url';
import { DebugEventsService } from '../debug-events/debug-events.service';

const DEFAULT_CHANNEL = 'default';
const DEFAULT_LOCALE = 'en';

@Injectable({ providedIn: 'root' })
export class CmsApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  private get shopApiBase(): string {
    return this.apiConfig.shopApiBase;
  }

  getPageDetails(payload?: {
    channel?: string;
    locale?: string;
  }): Observable<CmsPageDetail[]> {
    const shopEndpoint = `${this.shopApiBase}/page_translations`;
    const params = new HttpParams()
      .set(
        'channel',
        this.resolveContextValue(payload?.channel, DEFAULT_CHANNEL),
      )
      .set('locale', this.resolveContextValue(payload?.locale, DEFAULT_LOCALE));

    return this.http.get<unknown>(shopEndpoint, { params }).pipe(
      catchError((error: unknown) => {
        const status = this.resolveErrorStatus(error);

        if (status === 401 || status === 403 || status === 404) {
          this.debugEvents.log(
            'CmsApiService',
            'cms:getPageDetails:unavailable',
            {
              kind: 'network',
              level: 'warn',
              echoToConsole: true,
              context: {
                endpoint: shopEndpoint,
                query: params.toString(),
                status,
              },
            },
          );

          return of<unknown>([]);
        }

        return throwError(() => error);
      }),
      map((response) => {
        const pages = this.extractPageItems(response).map((item) =>
          this.toDetail(this.asRecord(item)),
        );

        this.debugEvents.log('CmsApiService', 'cms:getPageDetails:success', {
          kind: 'network',
          level: 'debug',
          echoToConsole: true,
          context: {
            endpoint: shopEndpoint,
            query: params.toString(),
            pageCount: pages.length,
            sampleUrlKeys: pages.slice(0, 10).map((page) => page.urlKey),
          },
        });

        return pages;
      }),
    );
  }

  getPages(payload?: {
    channel?: string;
    locale?: string;
  }): Observable<CmsPageSummary[]> {
    return this.getPageDetails(payload).pipe(
      map((pages) => pages.map(({ htmlContent, ...summary }) => summary)),
    );
  }

  getPageByUrlKey(
    urlKey: string,
    payload?: { channel?: string; locale?: string },
  ): Observable<CmsPageDetail> {
    return this.getPageDetails(payload).pipe(
      map((response) => {
        const match = response.find((item) => item.urlKey === urlKey);

        if (!match) {
          throw new Error(`CMS page not found: ${urlKey}`);
        }

        return match;
      }),
    );
  }

  private resolveContextValue(
    value: string | undefined,
    fallback: string,
  ): string {
    const normalized = (value ?? '').trim();

    return normalized || fallback;
  }

  private toSummary(value: unknown): CmsPageSummary {
    const item = this.asRecord(value);

    return {
      id: this.asNumber(item['id']) ?? 0,
      layout: this.asString(item['layout']) ?? null,
      pageTitle:
        this.asString(item['pageTitle']) ??
        this.asString(item['page_title']) ??
        'Untitled page',
      urlKey:
        this.asString(item['urlKey']) ?? this.asString(item['url_key']) ?? '',
      metaTitle:
        this.asString(item['metaTitle']) ??
        this.asString(item['meta_title']) ??
        null,
      metaDescription:
        this.asString(item['metaDescription']) ??
        this.asString(item['meta_description']) ??
        null,
      metaKeywords:
        this.asString(item['metaKeywords']) ??
        this.asString(item['meta_keywords']) ??
        null,
    };
  }

  private toDetail(value: Record<string, unknown>): CmsPageDetail {
    const summary = this.toSummary(value);

    return {
      ...summary,
      htmlContent:
        this.asString(value['htmlContent']) ??
        this.asString(value['html_content']) ??
        '',
    };
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private extractPageItems(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }

    const record = this.asRecord(value);
    const data = record['data'];

    if (Array.isArray(data)) {
      return data;
    }

    return [];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private asNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private resolveErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const status = (error as { status?: unknown }).status;

    return typeof status === 'number' && Number.isFinite(status)
      ? status
      : undefined;
  }
}
