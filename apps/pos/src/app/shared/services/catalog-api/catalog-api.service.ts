import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError, tap } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import { environment } from '../../../../environments/environment';
import {
  DownloadableProductLink,
  CatalogFilterAttribute,
  CatalogFilterOptionsResult,
  CatalogPriceRange,
  CatalogToolbarMetadata,
  Category,
  PageInfo,
  Product,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

export interface CatalogProductsResult {
  items: Product[];
  totalCount: number;
  pageInfo: PageInfo | null;
}

export interface CatalogProductsQuery {
  query?: string;
  sort?: string;
  sortKey?: string;
  reverse?: boolean;
  first?: number;
  limit?: number;
  page?: number;
  mode?: string;
  channel?: string;
  locale?: string;
  filter?: string;
  categoryId?: number | null;
  attributeFilters?: Record<string, string>;
  price?: CatalogPriceRange;
}

const DEFAULT_CHANNEL = 'default';
const DEFAULT_LOCALE = 'en';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);
  private preferredDownloadableEndpoint?: string;

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  private get shopApiBase(): string {
    return this.apiConfig.shopApiBase;
  }

  private get backendOrigin(): string {
    return this.apiConfig.backendOrigin;
  }

  getProducts(
    payload: CatalogProductsQuery,
  ): Observable<CatalogProductsResult> {
    const channel = this.resolveContextValue(payload.channel, DEFAULT_CHANNEL);
    const locale = this.resolveContextValue(payload.locale, DEFAULT_LOCALE);
    let params = new HttpParams();

    if (payload.query) params = params.set('query', payload.query);
    if (payload.sort) params = params.set('sort', payload.sort);
    if (!payload.sort && payload.sortKey)
      params = params.set('sort', payload.sortKey);
    if (payload.reverse) params = params.set('order', 'desc');
    if (payload.limit) params = params.set('limit', String(payload.limit));
    if (!payload.limit && payload.first)
      params = params.set('limit', String(payload.first));
    if (payload.page) params = params.set('page', String(payload.page));
    if (payload.mode) params = params.set('mode', payload.mode);
    params = params.set('channel', channel);
    params = params.set('locale', locale);
    if (payload.filter) params = params.set('filter', payload.filter);
    if (
      typeof payload.categoryId === 'number' &&
      Number.isFinite(payload.categoryId) &&
      payload.categoryId > 0
    ) {
      params = params.set('category_id', String(payload.categoryId));
    }

    Object.entries(payload.attributeFilters ?? {}).forEach(([code, value]) => {
      if (!value) {
        return;
      }

      params = params.set(code, value);
    });

    const priceMin = payload.price?.min;
    const priceMax = payload.price?.max;

    if (
      typeof priceMin === 'number' &&
      Number.isFinite(priceMin) &&
      typeof priceMax === 'number' &&
      Number.isFinite(priceMax)
    ) {
      params = params.set('price', `${priceMin},${priceMax}`);
    }

    const url = `${this.apiBase}/products`;
    const query = params.toString();
    const startedAt = Date.now();

    this.debugLog('getProducts:start', {
      url,
      query,
      payload,
      resolvedContext: { channel, locale },
    });

    return this.http.get<unknown>(url, { params }).pipe(
      map((response) => {
        const root = this.asRecord(response);
        const records = this.asArray(root['data']);
        const items = records.map((item) => this.toProduct(item));
        const meta = this.asRecord(root['meta']);
        const totalCount =
          this.toNumber(root['total']) ??
          this.toNumber(meta['total']) ??
          items.length;

        return {
          items,
          totalCount,
          pageInfo: this.toPageInfo(meta),
        };
      }),
      tap((result) => {
        this.debugLog('getProducts:success', {
          url,
          query,
          elapsedMs: Date.now() - startedAt,
          items: result.items.length,
          totalCount: result.totalCount,
        });
      }),
      catchError((error) => {
        this.debugLog('getProducts:error', {
          url,
          query,
          elapsedMs: Date.now() - startedAt,
          name: error?.name,
          message: error?.message,
          status: error?.status,
        });

        return throwError(() => error);
      }),
    );
  }

  getCategories(payload?: {
    channel?: string;
    locale?: string;
  }): Observable<Category[]> {
    const channel = this.resolveContextValue(payload?.channel, DEFAULT_CHANNEL);
    const locale = this.resolveContextValue(payload?.locale, DEFAULT_LOCALE);
    const params = new HttpParams()
      .set('channel', channel)
      .set('locale', locale);
    const url = `${this.apiBase}/categories`;
    const startedAt = Date.now();

    this.debugLog('getCategories:start', {
      url,
      query: params.toString(),
      resolvedContext: { channel, locale },
    });

    return this.http.get<unknown>(url, { params }).pipe(
      map((response) => {
        const root = this.asRecord(response);
        const directItems = this.asArray(response);
        const dataItems = this.asArray(root['data']);

        return (directItems.length > 0 ? directItems : dataItems).map((item) =>
          this.toCategory(item),
        );
      }),
      tap((categories) => {
        this.debugLog('getCategories:success', {
          url,
          elapsedMs: Date.now() - startedAt,
          categories: categories.length,
        });
      }),
      catchError((error) => {
        this.debugLog('getCategories:error', {
          url,
          elapsedMs: Date.now() - startedAt,
          name: error?.name,
          message: error?.message,
          status: error?.status,
        });

        return throwError(() => error);
      }),
    );
  }

  getToolbarMetadata(payload?: {
    sort?: string;
    limit?: number;
    mode?: string;
  }): Observable<CatalogToolbarMetadata> {
    this.debugLog('getToolbarMetadata:local', {
      reason: 'toolbar-computed-client-side',
      payload,
    });

    return of(this.defaultToolbarMetadata(payload));
  }

  getFilterableAttributes(
    categoryId?: number,
  ): Observable<CatalogFilterAttribute[]> {
    let params = new HttpParams();

    if (
      typeof categoryId === 'number' &&
      Number.isFinite(categoryId) &&
      categoryId > 0
    ) {
      params = params.set('category_id', String(categoryId));
    }

    return this.http
      .get<unknown>(`${this.apiBase}/categories/attributes`, { params })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          return this.asArray(root['data'])
            .map((entry) => {
              const item = this.asRecord(entry);

              return {
                id: this.toNumber(item['id']) ?? 0,
                code: this.toString(item['code']) ?? '',
                type: this.toString(item['type']) ?? '',
                name:
                  this.toString(item['name']) ??
                  this.toString(item['code']) ??
                  '',
              };
            })
            .filter(
              (attribute) => attribute.id > 0 && attribute.code.length > 0,
            );
        }),
      );
  }

  getAttributeOptions(
    attributeId: number,
    payload?: { search?: string; page?: number },
  ): Observable<CatalogFilterOptionsResult> {
    let params = new HttpParams();

    if (payload?.search) params = params.set('search', payload.search);
    if (payload?.page) params = params.set('page', String(payload.page));

    return this.http
      .get<unknown>(
        `${this.apiBase}/categories/attributes/${attributeId}/options`,
        { params },
      )
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const meta = this.asRecord(root['meta']);

          return {
            items: this.asArray(root['data'])
              .map((entry) => {
                const item = this.asRecord(entry);

                return {
                  id: this.toString(item['id']) ?? '',
                  name: this.toString(item['name']) ?? '',
                };
              })
              .filter((option) => option.id.length > 0),
            currentPage: this.toNumber(meta['current_page']) ?? 1,
            totalPages: this.toNumber(meta['last_page']) ?? 1,
            totalCount: this.toNumber(meta['total']) ?? 0,
          };
        }),
      );
  }

  getCategoryMaxPrice(categoryId?: number): Observable<number> {
    const suffix =
      typeof categoryId === 'number' &&
      Number.isFinite(categoryId) &&
      categoryId > 0
        ? `/${categoryId}`
        : '';

    return this.http
      .get<unknown>(`${this.apiBase}/categories/max-price${suffix}`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const data = this.asRecord(root['data']);

          return (
            this.toNumber(data['max_price']) ??
            this.toNumber(root['max_price']) ??
            0
          );
        }),
      );
  }

  getProductDownloadableLinks(
    productId: number,
  ): Observable<DownloadableProductLink[]> {
    const normalizedProductId = Math.trunc(productId);

    if (!Number.isFinite(normalizedProductId) || normalizedProductId < 1) {
      return throwError(
        () => new Error('Invalid product id for downloadable links.'),
      );
    }

    const attempts: Array<{
      url: string;
      params?: HttpParams;
    }> = [
      {
        url: `${this.shopApiBase}/product-downloadable-links`,
        params: new HttpParams().set('product_id', String(normalizedProductId)),
      },
      {
        url: `${this.shopApiBase}/product-downloadable-links/${normalizedProductId}`,
      },
      {
        url: `${this.apiBase}/shop/product-downloadable-links`,
        params: new HttpParams().set('product_id', String(normalizedProductId)),
      },
      {
        url: `${this.apiBase}/shop/product-downloadable-links/${normalizedProductId}`,
      },
      {
        url: `${this.apiBase}/product-downloadable-links/${normalizedProductId}`,
      },
      {
        url: `${this.apiBase}/product-downloadable-links`,
        params: new HttpParams().set('product_id', String(normalizedProductId)),
      },
    ];

    const orderedAttempts = this.orderDownloadableAttempts(attempts);

    return this.tryDownloadableEndpoint(orderedAttempts, 0);
  }

  private toProduct(raw: Record<string, unknown>): Product {
    const prices = this.asRecord(raw['prices']);
    const baseImage = this.asRecord(raw['base_image']);
    const images = this.asArray(raw['images']);
    const firstImage = this.asRecord(images[0]);
    const minimal = this.asRecord(prices['minimal']);
    const special = this.asRecord(prices['special']);
    const regular = this.asRecord(prices['regular']);
    const finalPrice = this.asRecord(prices['final']);
    const rawConfigurableConfig = this.asRecord(
      raw['configurable_config'] ?? raw['configurableConfig'],
    );
    const rawBundleConfig = this.asRecord(
      raw['bundle_config'] ?? raw['bundleConfig'],
    );
    const fallbackType =
      Object.keys(rawConfigurableConfig).length > 0
        ? 'configurable'
        : Object.keys(rawBundleConfig).length > 0
          ? 'bundle'
          : undefined;
    const configurableIndex = this.asRecord(rawConfigurableConfig['index']);
    const configurableAttributes = this.asArray(
      rawConfigurableConfig['attributes'],
    ).map((attribute) => {
      const item = this.asRecord(attribute);

      return {
        id: this.toNumber(item['id']) ?? 0,
        code: this.toString(item['code']),
        label: this.toString(item['label']),
        options: this.asArray(item['options']).map((option) => {
          const optionItem = this.asRecord(option);

          return {
            id: this.toNumber(optionItem['id']) ?? 0,
            label: this.toString(optionItem['label']),
            swatchValue: this.toString(optionItem['swatch_value']),
            products: this.asArray(optionItem['products'])
              .map((productId) => this.toNumber(productId))
              .filter(
                (productId): productId is number =>
                  typeof productId === 'number' &&
                  Number.isFinite(productId) &&
                  productId > 0,
              ),
          };
        }),
      };
    });
    const bundleOptions = this.asArray(rawBundleConfig['options']).map(
      (option) => {
        const item = this.asRecord(option);

        return {
          id: this.toNumber(item['id']) ?? 0,
          title:
            this.toString(item['title']) ??
            this.toString(item['label']) ??
            this.toString(item['name']),
          label: this.toString(item['label']) ?? this.toString(item['name']),
          type: this.toString(item['type']),
          isRequired: Boolean(item['is_required']),
          allowMultiple: Boolean(item['is_multi'] ?? item['is_multiple']),
          products: this.asArray(item['products']).map((product) => {
            const productItem = this.asRecord(product);

            return {
              id: this.toNumber(productItem['id']) ?? 0,
              label:
                this.toString(productItem['label']) ??
                this.toString(productItem['name']),
              name:
                this.toString(productItem['name']) ??
                this.toString(productItem['label']),
              type: this.toString(productItem['type']),
              qty: this.toNumber(productItem['qty']) ?? 1,
              isDefault: Boolean(productItem['is_default']),
              price:
                this.toNumber(productItem['price']) ??
                this.toNumber(productItem['final_price']),
              formattedPrice:
                this.toString(productItem['formatted_price']) ??
                this.toString(productItem['formatted_final_price']),
            };
          }),
        };
      },
    );
    const baseImageUrl = this.normalizeMediaUrl(
      this.toString(baseImage['medium_image_url']) ??
        this.toString(baseImage['small_image_url']) ??
        this.toString(baseImage['large_image_url']) ??
        this.toString(baseImage['original_image_url']) ??
        this.toString(baseImage['url']) ??
        this.toString(firstImage['medium_image_url']) ??
        this.toString(firstImage['small_image_url']) ??
        this.toString(firstImage['large_image_url']) ??
        this.toString(firstImage['original_image_url']) ??
        this.toString(firstImage['url']),
    );

    return {
      id: this.toString(raw['id']) ?? '',
      numericId: this.toNumber(raw['id']) ?? undefined,
      sku: this.toString(raw['sku']),
      name: this.toString(raw['name']),
      urlKey: this.toString(raw['url_key']),
      description: this.toString(raw['description']),
      baseImageUrl,
      minimumPrice: this.toNumber(minimal['price']),
      specialPrice: this.toNumber(special['price']) ?? null,
      isSaleable: Boolean(raw['is_saleable']),
      price:
        this.toNumber(regular['price']) ?? this.toNumber(finalPrice['price']),
      shortDescription: this.toString(raw['short_description']),
      type: this.toString(raw['type']) ?? fallbackType,
      isOptionsRequired: Boolean(raw['is_options_required']),
      configurableConfig: {
        attributes: configurableAttributes,
        index: Object.keys(configurableIndex).reduce<
          Record<string, Record<string, number>>
        >((acc, variantId) => {
          const indexItem = this.asRecord(configurableIndex[variantId]);
          const normalized = Object.keys(indexItem).reduce<
            Record<string, number>
          >((inner, attributeId) => {
            const value = this.toNumber(indexItem[attributeId]);

            if (
              typeof value === 'number' &&
              Number.isFinite(value) &&
              value > 0
            ) {
              inner[attributeId] = value;
            }

            return inner;
          }, {});

          if (Object.keys(normalized).length > 0) {
            acc[variantId] = normalized;
          }

          return acc;
        }, {}),
      },
      bundleConfig: {
        options: bundleOptions,
      },
      isWishlist: Boolean(raw['is_wishlist']),
    };
  }

  private toCategory(raw: Record<string, unknown>): Category {
    const translation = this.resolveCategoryTranslation(raw);
    const logo = this.asRecord(raw['logo']);
    const banner = this.asRecord(raw['banner']);
    const logoUrl = this.normalizeMediaUrl(
      this.toString(raw['logo_url']) ??
        this.toString(raw['logoUrl']) ??
        this.toString(raw['logo_path']) ??
        this.toString(raw['logoPath']) ??
        this.toString(logo['medium_image_url']) ??
        this.toString(logo['small_image_url']) ??
        this.toString(logo['url']),
    );
    const bannerUrl = this.normalizeMediaUrl(
      this.toString(raw['banner_url']) ??
        this.toString(raw['bannerUrl']) ??
        this.toString(raw['banner_path']) ??
        this.toString(raw['bannerPath']) ??
        this.toString(banner['medium_image_url']) ??
        this.toString(banner['small_image_url']) ??
        this.toString(banner['url']),
    );

    return {
      id: this.toString(raw['id']) ?? '',
      numericId: this.toNumber(raw['id']) ?? undefined,
      position: this.toNumber(raw['position']) ?? undefined,
      logoPath:
        this.toString(raw['logo_path']) ?? this.toString(raw['logoPath']),
      logoUrl,
      bannerUrl,
      status: this.toString(raw['status']),
      translation: {
        id: this.toString(translation['id']),
        name: this.toString(raw['name']) ?? this.toString(translation['name']),
        slug: this.toString(raw['slug']) ?? this.toString(translation['slug']),
        description:
          this.toString(raw['description']) ??
          this.toString(translation['description']),
        urlPath:
          this.toString(raw['url_path']) ??
          this.toString(raw['urlPath']) ??
          this.toString(translation['url_path']) ??
          this.toString(translation['urlPath']),
        metaTitle:
          this.toString(raw['meta_title']) ??
          this.toString(raw['metaTitle']) ??
          this.toString(translation['meta_title']) ??
          this.toString(translation['metaTitle']),
      },
      children: this.asArray(raw['children']).map((child) =>
        this.toCategory(child),
      ),
    };
  }

  private resolveCategoryTranslation(
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    const directTranslation = this.asRecord(raw['translation']);

    if (Object.keys(directTranslation).length > 0) {
      return directTranslation;
    }

    return this.asArray(raw['translations'])[0] ?? {};
  }

  private defaultToolbarMetadata(payload?: {
    sort?: string;
    limit?: number;
    mode?: string;
  }): CatalogToolbarMetadata {
    const orders = [
      {
        title: 'Name A-Z',
        value: 'name-asc',
        sort: 'name',
        order: 'asc' as const,
        position: 1,
      },
      {
        title: 'Name Z-A',
        value: 'name-desc',
        sort: 'name',
        order: 'desc' as const,
        position: 2,
      },
      {
        title: 'Newest First',
        value: 'created_at-desc',
        sort: 'created_at',
        order: 'desc' as const,
        position: 3,
      },
      {
        title: 'Oldest First',
        value: 'created_at-asc',
        sort: 'created_at',
        order: 'asc' as const,
        position: 4,
      },
      {
        title: 'Price Low to High',
        value: 'price-asc',
        sort: 'price',
        order: 'asc' as const,
        position: 5,
      },
      {
        title: 'Price High to Low',
        value: 'price-desc',
        sort: 'price',
        order: 'desc' as const,
        position: 6,
      },
    ];
    const limits = [12, 24, 36, 48];
    const modes = ['grid', 'list'];
    const currentSort =
      payload?.sort && orders.some((entry) => entry.value === payload.sort)
        ? payload.sort
        : 'price-desc';
    const currentLimit =
      typeof payload?.limit === 'number' && limits.includes(payload.limit)
        ? payload.limit
        : 12;
    const currentMode = payload?.mode === 'list' ? 'list' : 'grid';

    return {
      orders,
      limits,
      modes,
      defaultSort: 'price-desc',
      defaultLimit: 12,
      defaultMode: 'grid',
      currentSort,
      currentLimit,
      currentMode,
    };
  }

  private toPageInfo(meta: Record<string, unknown>): PageInfo | null {
    const currentPage = this.toNumber(meta['current_page']);
    const perPage = this.toNumber(meta['per_page']);
    const lastPage = this.toNumber(meta['last_page']);

    if (!currentPage || !perPage || !lastPage) {
      return null;
    }

    return {
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < lastPage,
      currentPage,
      perPage,
      totalPages: lastPage,
    };
  }

  private tryDownloadableEndpoint(
    attempts: Array<{ url: string; params?: HttpParams }>,
    index: number,
  ): Observable<DownloadableProductLink[]> {
    const current = attempts[index];

    if (!current) {
      return throwError(
        () =>
          new Error(
            'No downloadable links endpoint is available on this server.',
          ),
      );
    }

    return this.http.get<unknown>(current.url, { params: current.params }).pipe(
      map((response) => {
        this.preferredDownloadableEndpoint = current.url;
        return this.toDownloadableLinks(response);
      }),
      catchError((error) => {
        if (this.shouldTryNextDownloadableEndpoint(error)) {
          return this.tryDownloadableEndpoint(attempts, index + 1);
        }

        return throwError(() => error);
      }),
    );
  }

  private toDownloadableLinks(response: unknown): DownloadableProductLink[] {
    const root = this.asRecord(response);
    const data = root['data'];
    const records = root['records'];
    const items = root['items'];

    const collectionSource = Array.isArray(data)
      ? data
      : Array.isArray(records)
        ? records
        : Array.isArray(items)
          ? items
          : Array.isArray(response)
            ? response
            : [];

    return this.asArray(collectionSource)
      .map((entry) => {
        const id = this.toNumber(entry['id']) ?? 0;

        return {
          id,
          title:
            this.toString(entry['title']) ??
            this.toString(entry['name']) ??
            this.toString(entry['label']) ??
            `Download ${id}`,
          price: this.toNumber(entry['price']),
          formattedPrice:
            this.toString(entry['formatted_price']) ??
            this.toString(entry['formattedPrice']),
          type: this.toString(entry['type']),
        };
      })
      .filter((link) => Number.isFinite(link.id) && link.id > 0);
  }

  private shouldTryNextDownloadableEndpoint(error: unknown): boolean {
    const status = (error as { status?: number })?.status;

    return status === 404 || status === 400 || status === 405;
  }

  private orderDownloadableAttempts(
    attempts: Array<{ url: string; params?: HttpParams }>,
  ): Array<{ url: string; params?: HttpParams }> {
    if (!this.preferredDownloadableEndpoint) {
      return attempts;
    }

    const preferred = attempts.filter(
      (entry) => entry.url === this.preferredDownloadableEndpoint,
    );
    const fallback = attempts.filter(
      (entry) => entry.url !== this.preferredDownloadableEndpoint,
    );

    return [...preferred, ...fallback];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private asArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === 'object',
    );
  }

  private asPrimitiveArray(value: unknown): Array<string | number | boolean> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string | number | boolean =>
      ['string', 'number', 'boolean'].includes(typeof item),
    );
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
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private normalizeMediaUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const normalizedPath = url.startsWith('/') ? url : `/${url}`;

    // Relative media URLs should resolve against the configured backend origin.
    // In local web dev, API may be proxied via localhost:8100 while media is served by Laravel on 8000.
    const mediaOrigin = this.apiConfig.serverOrigin || this.backendOrigin;

    if (!mediaOrigin) {
      return normalizedPath;
    }

    return `${mediaOrigin}${normalizedPath}`;
  }

  private debugLog(message: string, details?: unknown): void {
    this.debugEvents.log('CatalogApiService', message, {
      kind: 'application',
      level: message.includes(':error') ? 'error' : 'debug',
      context:
        details && typeof details === 'object'
          ? (details as Record<string, unknown>)
          : undefined,
      echoToConsole: !environment.production,
    });
  }

  private resolveBackendOrigin(apiBase: string): string | undefined {
    if (!apiBase) {
      return undefined;
    }

    try {
      if (/^https?:\/\//i.test(apiBase)) {
        return new URL(apiBase).origin;
      }

      return window.location.origin;
    } catch {
      return undefined;
    }
  }

  private resolveContextValue(
    value: string | undefined,
    fallback: string,
  ): string {
    const normalized = (value ?? '').trim();

    return normalized || fallback;
  }
}
