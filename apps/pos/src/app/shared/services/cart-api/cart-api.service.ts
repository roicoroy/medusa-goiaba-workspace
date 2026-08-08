import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  Cart,
  CartItem,
  CartTokenResponse,
  Product,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

export interface CartPayload {
  cart: Cart;
}

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  private get shopApiBase(): string {
    return this.apiConfig.shopApiBase;
  }

  private get backendOrigin(): string {
    return this.apiConfig.backendOrigin;
  }

  /**
   * Get suggested products for the cart page (stub, replace with real API logic)
   */
  getSuggestedProducts(cartProductIds: number[]): Observable<Product[]> {
    // TODO: Replace with real API call (e.g., cross-sell, related, or featured products)
    return of([]);
  }

  createCartToken(): Observable<{ cartToken: CartTokenResponse }> {
    this.debugEvents.log('CartApiService', 'createCartToken:request', {
      kind: 'network',
      level: 'debug',
      echoToConsole: true,
      context: {
        mode: 'local',
      },
    });

    return of({
      cartToken: this.createLocalCartTokenResponse(),
    });
  }

  getCart(payload: {
    cartToken?: string;
    cartId?: number;
    channel?: string;
    locale?: string;
  }): Observable<CartPayload> {
    if (payload.cartToken) {
      // Guest with token → token-based shop API
      if (!payload.cartId || payload.cartId < 1) {
        return of({ cart: this.createEmptyCart(payload.cartToken) });
      }

      return this.http
        .get<unknown>(`${this.shopApiBase}/get-cart-tokens/${payload.cartId}`)
        .pipe(
          map((response) => ({
            cart: this.toCart(response, payload.cartToken),
          })),
          catchError((error: { status?: number }) => {
            if (error?.status === 404) {
              return of({ cart: this.createEmptyCart(payload.cartToken) });
            }

            return throwError(() => error);
          }),
          catchError(
            this.handleError<{ cart: Cart }>('getCart', {
              cart: this.createEmptyCart(payload.cartToken),
            }),
          ),
        );
    }

    // Authenticated → session-based checkout API
    return this.http.get<unknown>(`${this.apiBase}/checkout/cart`).pipe(
      map((response) => {
        const root = this.asRecord(response);
        const hasNullData =
          Object.prototype.hasOwnProperty.call(root, 'data') &&
          root['data'] === null;

        if (hasNullData) {
          throw { status: 404, message: 'Checkout cart returned null data.' };
        }

        return { cart: this.toCart(response) };
      }),
      catchError((error: { status?: number }) => {
        if (error?.status === 404) {
          return of({ cart: this.createEmptyCart() });
        }

        return throwError(() => error);
      }),
      catchError(
        this.handleError<{ cart: Cart }>('getCart', {
          cart: this.createEmptyCart(),
        }),
      ),
    );
  }

  addProductToCart(payload: {
    preferCheckout?: boolean;
    cartId?: number;
    cartToken?: string;
    productId: number;
    quantity: number;
    parentProductId?: number;
    selectedConfigurableOption?: number;
    superAttribute?: Record<string, number>;
    bundleOptions?: Record<string, number[]>;
    bundleOptionQty?: Record<string, number>;
    links?: number[];
  }): Observable<CartPayload> {
    const options: Record<string, unknown> = {};
    if (
      payload.selectedConfigurableOption &&
      payload.selectedConfigurableOption > 0
    ) {
      options['selected_configurable_option'] =
        payload.selectedConfigurableOption;
    }
    if (
      payload.superAttribute &&
      Object.keys(payload.superAttribute).length > 0
    ) {
      options['super_attribute'] = payload.superAttribute;
    }
    if (
      payload.bundleOptions &&
      Object.keys(payload.bundleOptions).length > 0
    ) {
      options['bundle_options'] = payload.bundleOptions;
    }
    if (
      payload.bundleOptionQty &&
      Object.keys(payload.bundleOptionQty).length > 0
    ) {
      options['bundle_option_qty'] = payload.bundleOptionQty;
    }
    if (Array.isArray(payload.links) && payload.links.length > 0) {
      options['links'] = payload.links;
    }
    const shopBody: Record<string, unknown> = {
      product_id: payload.productId,
      productId: payload.productId,
      quantity: payload.quantity,
      qty: payload.quantity,
      ...options,
    };

    if (payload.cartId && payload.cartId > 0) {
      shopBody['cart_id'] = payload.cartId;
      shopBody['cartId'] = payload.cartId;
    }

    if (payload.cartToken) {
      shopBody['cart_token'] = payload.cartToken;
      shopBody['cartToken'] = payload.cartToken;
    }

    if (payload.parentProductId && payload.parentProductId > 0) {
      shopBody['parent_id'] = payload.parentProductId;
      shopBody['parentId'] = payload.parentProductId;
    }

    const checkoutBody: Record<string, unknown> = {
      product_id: payload.productId,
      quantity: payload.quantity,
      ...options,
    };

    const addViaShopApi = () => {
      this.debugEvents.log('CartApiService', 'addProductToCart:shop:request', {
        kind: 'network',
        level: 'debug',
        echoToConsole: true,
        context: {
          endpoint: `${this.shopApiBase}/add-product-in-cart`,
          body: shopBody,
        },
      });

      return this.http
        .post<unknown>(`${this.shopApiBase}/add-product-in-cart`, shopBody)
        .pipe(
          catchError((error: unknown) => {
            this.debugEvents.log(
              'CartApiService',
              'addProductToCart:shop:error',
              {
                kind: 'network',
                level: 'warn',
                echoToConsole: true,
                context: {
                  endpoint: `${this.shopApiBase}/add-product-in-cart`,
                  requestBody: shopBody,
                  ...this.extractErrorContext(error),
                },
              },
            );

            return throwError(() => error);
          }),
        );
    };

    if (payload.preferCheckout) {
      // Authenticated → session-based checkout API
      return this.http
        .post<unknown>(`${this.apiBase}/checkout/cart`, checkoutBody)
        .pipe(
          catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 419) {
              return throwError(() => error);
            }

            this.debugEvents.log(
              'CartApiService',
              'addProductToCart:checkout:retry-after-419',
              {
                kind: 'network',
                level: 'warn',
                echoToConsole: true,
                context: {
                  endpoint: `${this.apiBase}/checkout/cart`,
                  ...this.extractErrorContext(error),
                },
              },
            );

            return this.http.post<unknown>(
              `${this.apiBase}/checkout/cart`,
              checkoutBody,
            );
          }),
          map((response) => ({
            cart: this.toCart(response, payload.cartToken),
          })),
          catchError((error: unknown) => {
            this.debugEvents.log(
              'CartApiService',
              'addProductToCart:checkout:error',
              {
                kind: 'network',
                level: 'warn',
                echoToConsole: true,
                context: {
                  endpoint: `${this.apiBase}/checkout/cart`,
                  ...this.extractErrorContext(error),
                },
              },
            );

            if (!this.shouldFallbackToShopApi(error)) {
              return throwError(() => error);
            }

            this.debugEvents.log(
              'CartApiService',
              'addProductToCart:checkout:fallback-to-shop',
              {
                kind: 'network',
                level: 'warn',
                echoToConsole: true,
                context: {
                  status:
                    error instanceof HttpErrorResponse
                      ? error.status
                      : undefined,
                  endpoint: `${this.apiBase}/checkout/cart`,
                  fallbackEndpoint: `${this.shopApiBase}/add-product-in-cart`,
                },
              },
            );

            return addViaShopApi();
          }),
          map((response) => ({
            cart: this.toCart(response, payload.cartToken),
          })),
          catchError(
            this.handleError<{ cart: Cart }>('addProductToCart', {
              cart: this.createEmptyCart(payload.cartToken),
            }),
          ),
        );
    }
    // Guest with token → token-based shop API
    return addViaShopApi().pipe(
      map((response) => ({ cart: this.toCart(response, payload.cartToken) })),
      catchError(
        this.handleError<{ cart: Cart }>('addProductToCart', {
          cart: this.createEmptyCart(payload.cartToken),
        }),
      ),
    );
  }

  updateCartItem(payload: {
    preferCheckout?: boolean;
    cartToken?: string;
    cartItemId: number;
    quantity: number;
  }): Observable<CartPayload> {
    if (payload.preferCheckout) {
      // Authenticated → session-based checkout API
      return this.http
        .put<unknown>(`${this.apiBase}/checkout/cart`, {
          qty: {
            [payload.cartItemId]: payload.quantity,
          },
        })
        .pipe(
          map((response) => ({
            cart: this.toCart(response, payload.cartToken),
          })),
          catchError(
            this.handleError<{ cart: Cart }>('updateCartItem', {
              cart: this.createEmptyCart(payload.cartToken),
            }),
          ),
        );
    }
    // Guest with token → token-based shop API
    return this.http
      .post<unknown>(`${this.shopApiBase}/update-cart-item`, {
        cartItemId: payload.cartItemId,
        quantity: payload.quantity,
      })
      .pipe(
        map((response) => ({ cart: this.toCart(response, payload.cartToken) })),
        catchError(
          this.handleError<{ cart: Cart }>('updateCartItem', {
            cart: this.createEmptyCart(payload.cartToken),
          }),
        ),
      );
  }

  removeCartItem(payload: {
    cartToken?: string;
    cartItemId: number;
    preferCheckout?: boolean;
  }): Observable<CartPayload> {
    if (payload.preferCheckout || !payload.cartToken) {
      // Authenticated → session-based checkout API
      return this.http
        .request<unknown>('delete', `${this.apiBase}/checkout/cart`, {
          body: {
            cart_item_id: payload.cartItemId,
          },
        })
        .pipe(
          map((response) => ({
            cart: this.toCart(response, payload.cartToken),
          })),
          catchError(
            this.handleError<{ cart: Cart }>('removeCartItem', {
              cart: this.createEmptyCart(payload.cartToken),
            }),
          ),
        );
    }
    // Guest with token → token-based shop API
    return this.http
      .post<unknown>(`${this.shopApiBase}/remove-cart-item`, {
        cartItemId: payload.cartItemId,
      })
      .pipe(
        map((response) => ({ cart: this.toCart(response, payload.cartToken) })),
        catchError(
          this.handleError<{ cart: Cart }>('removeCartItem', {
            cart: this.createEmptyCart(payload.cartToken),
          }),
        ),
      );
  }

  mergeCart(payload: { cartId: number }): Observable<CartPayload> {
    // CartTokenProcessor reads cartId from the request body (not URI variables) for the mergeGuest
    // operation, so we must send it in both the URL path and the body.
    return this.http
      .post<unknown>(`${this.shopApiBase}/merge-carts/${payload.cartId}`, {
        cartId: payload.cartId,
      })
      .pipe(
        map((response) => ({ cart: this.toCart(response) })),
        catchError(
          this.handleError<{ cart: Cart }>('mergeCart', {
            cart: this.createEmptyCart(),
          }),
        ),
      );
  }

  addProductToCheckoutSession(payload: {
    productId: number;
    quantity: number;
    selectedConfigurableOption?: number;
    superAttribute?: Record<string, number>;
    bundleOptions?: Record<string, number[]>;
    bundleOptionQty?: Record<string, number>;
    links?: number[];
  }): Observable<void> {
    const body: Record<string, unknown> = {
      product_id: payload.productId,
      quantity: payload.quantity,
    };

    if (
      payload.selectedConfigurableOption &&
      payload.selectedConfigurableOption > 0
    ) {
      body['selected_configurable_option'] = payload.selectedConfigurableOption;
    }

    if (
      payload.superAttribute &&
      Object.keys(payload.superAttribute).length > 0
    ) {
      body['super_attribute'] = payload.superAttribute;
    }

    if (
      payload.bundleOptions &&
      Object.keys(payload.bundleOptions).length > 0
    ) {
      body['bundle_options'] = payload.bundleOptions;
    }

    if (
      payload.bundleOptionQty &&
      Object.keys(payload.bundleOptionQty).length > 0
    ) {
      body['bundle_option_qty'] = payload.bundleOptionQty;
    }

    if (Array.isArray(payload.links) && payload.links.length > 0) {
      body['links'] = payload.links;
    }

    return this.postCheckoutCart(body).pipe(
      map(() => void 0),
      catchError((error: unknown) => {
        this.debugEvents.log(
          'CartApiService',
          'addProductToCheckoutSession:error',
          {
            kind: 'network',
            level: 'warn',
            echoToConsole: true,
            context: {
              endpoint: `${this.apiBase}/checkout/cart`,
              requestBody: body,
              ...this.extractErrorContext(error),
            },
          },
        );

        return of(void 0);
      }),
    );
  }

  private createEmptyCart(cartToken?: string): Cart {
    return {
      id: 0,
      cartToken,
      subtotal: 0,
      taxAmount: 0,
      shippingAmount: 0,
      grandTotal: 0,
      discountAmount: 0,
      couponCode: undefined,
      itemsCount: 0,
      itemsQty: 0,
      isGuest: true,
      items: [],
      sessionToken: undefined,
    };
  }

  private createLocalCartTokenResponse(): CartTokenResponse {
    const token =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return {
      id: 0,
      cartToken: token,
      sessionToken: token,
      isGuest: true,
      success: true,
    };
  }

  private toCartTokenResponse(response: unknown): CartTokenResponse {
    const root = this.asRecord(response);
    const data = this.asRecord(root['data']);
    const payload = Object.keys(data).length > 0 ? data : root;

    const id =
      this.toNumber(payload['id']) ?? this.toNumber(payload['cart_id']) ?? 0;
    const cartToken =
      this.toString(payload['cartToken']) ??
      this.toString(payload['cart_token']) ??
      this.toString(payload['token']) ??
      '';
    const sessionToken =
      this.toString(payload['sessionToken']) ??
      this.toString(payload['session_token']) ??
      undefined;

    if (!cartToken) {
      return this.createLocalCartTokenResponse();
    }

    return {
      id,
      cartToken,
      sessionToken,
      isGuest: true,
      success: true,
    };
  }

  private extractErrorContext(error: unknown): Record<string, unknown> {
    if (!(error instanceof HttpErrorResponse)) {
      return {};
    }

    return {
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
      message: error.message,
      response:
        typeof error.error === 'object' && error.error !== null
          ? error.error
          : String(error.error ?? ''),
    };
  }

  private postCheckoutCart(body: Record<string, unknown>): Observable<unknown> {
    this.logCheckoutDiagnostics();

    return this.http.post<unknown>(`${this.apiBase}/checkout/cart`, body);
  }

  private logCheckoutDiagnostics(): void {
    const checkoutEndpoint = `${this.apiBase}/checkout/cart`;
    const xsrfCookie = this.readCookie('XSRF-TOKEN');
    const sessionCookie =
      this.readCookie('goiaba_session') ?? this.readCookie('laravel_session');
    const storefrontKey = this.apiConfig.storefrontKey;

    let checkoutOrigin: string | undefined;
    let frontendOrigin: string | undefined;

    if (typeof window !== 'undefined') {
      frontendOrigin = window.location.origin;
    }

    try {
      checkoutOrigin = new URL(checkoutEndpoint).origin;
    } catch {
      checkoutOrigin = undefined;
    }

    const decodedXsrf = xsrfCookie ? decodeURIComponent(xsrfCookie) : null;

    this.debugEvents.log(
      'CartApiService',
      'addProductToCart:checkout:diagnostics',
      {
        kind: 'network',
        level: 'debug',
        echoToConsole: true,
        context: {
          endpoint: checkoutEndpoint,
          frontendOrigin,
          backendOrigin: this.backendOrigin,
          checkoutOrigin,
          isCrossOrigin:
            Boolean(frontendOrigin) && Boolean(checkoutOrigin)
              ? frontendOrigin !== checkoutOrigin
              : undefined,
          xsrfCookiePresent: Boolean(xsrfCookie),
          sessionCookiePresent: Boolean(sessionCookie),
          xXsrfTokenHeaderWillBeAttached: Boolean(decodedXsrf),
          xXsrfTokenHeaderLength: decodedXsrf?.length ?? 0,
          storefrontKeyPresent: Boolean(storefrontKey),
          storefrontKeyPrefix: storefrontKey
            ? storefrontKey.slice(0, 14)
            : null,
          withCredentialsExpected: true,
        },
      },
    );
  }

  private readCookie(name: string): string | null {
    if (typeof document === 'undefined' || !document.cookie) {
      return null;
    }

    const prefix = `${encodeURIComponent(name)}=`;
    const item = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(prefix));

    return item ? item.slice(prefix.length) : null;
  }

  private shouldFallbackToShopApi(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    return error.status === 403 || error.status === 401;
  }

  private toCart(response: unknown, fallbackToken?: string): Cart {
    const root = this.asRecord(response);
    const dataNode = this.asRecord(root['data']);
    const rawCart = Object.keys(dataNode).length > 0 ? dataNode : root;
    const items = this.asArray(rawCart['items']).map((item) =>
      this.toCartItem(item),
    );

    const apiToken =
      this.toString(rawCart['cart_token']) ??
      this.toString(rawCart['cartToken']);

    return {
      id:
        this.toNumber(rawCart['cart_id']) ?? this.toNumber(rawCart['id']) ?? 0,
      cartToken: this.resolveCartToken(apiToken, fallbackToken),
      subtotal:
        this.toNumber(rawCart['sub_total']) ??
        this.toNumber(rawCart['subtotal']) ??
        0,
      taxAmount:
        this.toNumber(rawCart['tax_total']) ??
        this.toNumber(rawCart['taxAmount']) ??
        this.toNumber(rawCart['taxTotal']) ??
        0,
      shippingAmount: this.toNumber(rawCart['shipping_amount']) ?? 0,
      grandTotal:
        this.toNumber(rawCart['grand_total']) ??
        this.toNumber(rawCart['grandTotal']) ??
        0,
      discountAmount:
        this.toNumber(rawCart['discount_amount']) ??
        this.toNumber(rawCart['discountAmount']) ??
        0,
      couponCode:
        this.toString(rawCart['coupon_code']) ??
        this.toString(rawCart['couponCode']),
      itemsCount:
        this.toNumber(rawCart['items_count']) ??
        this.toNumber(rawCart['itemsCount']) ??
        items.length,
      itemsQty:
        this.toNumber(rawCart['items_qty']) ??
        this.toNumber(rawCart['itemsQty']) ??
        items.reduce((sum, item) => sum + item.quantity, 0),
      isGuest: Boolean(rawCart['is_guest'] ?? rawCart['isGuest'] ?? true),
      items,
      sessionToken:
        this.toString(rawCart['session_token']) ??
        this.toString(rawCart['sessionToken']),
    };
  }

  private resolveCartToken(
    apiToken?: string,
    fallbackToken?: string,
  ): string | undefined {
    if (!apiToken || apiToken.trim().length === 0) {
      return fallbackToken;
    }

    // Bagisto API may return cart ID as cartToken for existing carts.
    // Preserve previously known token (UUID/Sanctum-like) instead of replacing with numeric ID.
    const isNumericId = /^\d+$/.test(apiToken);

    if (isNumericId && fallbackToken && fallbackToken.trim().length > 0) {
      return fallbackToken;
    }

    return apiToken;
  }

  private toCartItem(raw: Record<string, unknown>): CartItem {
    const image = this.asRecord(raw['image']);
    const baseImageRecord =
      this.parseJsonRecord(raw['baseImage']) ??
      this.parseJsonRecord(raw['base_image']) ??
      this.asRecord(raw['baseImage']) ??
      this.asRecord(raw['base_image']);
    const product = this.asRecord(raw['product']);
    const productBaseImage = this.asRecord(product['base_image']);

    const baseImage = this.normalizeMediaUrl(
      this.toString(image['medium_image_url']) ??
        this.toString(image['small_image_url']) ??
        this.toString(image['large_image_url']) ??
        this.toString(image['original_image_url']) ??
        this.toString(image['url']) ??
        this.toString(baseImageRecord['medium_image_url']) ??
        this.toString(baseImageRecord['small_image_url']) ??
        this.toString(baseImageRecord['large_image_url']) ??
        this.toString(baseImageRecord['original_image_url']) ??
        this.toString(baseImageRecord['url']) ??
        this.toString(productBaseImage['medium_image_url']) ??
        this.toString(productBaseImage['small_image_url']) ??
        this.toString(productBaseImage['large_image_url']) ??
        this.toString(productBaseImage['original_image_url']) ??
        this.toString(productBaseImage['url']) ??
        this.toString(raw['image_url']) ??
        this.toString(raw['base_image_url']) ??
        this.toString(raw['baseImage']) ??
        this.toString(raw['base_image']),
    );

    return {
      id: this.toNumber(raw['id']) ?? 0,
      cartId:
        this.toNumber(raw['cart_id']) ?? this.toNumber(raw['cartId']) ?? 0,
      productId:
        this.toNumber(raw['product_id']) ??
        this.toNumber(raw['productId']) ??
        0,
      name:
        this.toString(raw['name']) ?? this.toString(raw['product_name']) ?? '',
      price: this.toNumber(raw['price']) ?? this.toNumber(raw['total']) ?? 0,
      baseImage,
      sku: this.toString(raw['sku']),
      quantity: this.toNumber(raw['quantity']) ?? 1,
      type: this.toString(raw['type']),
      productUrlKey:
        this.toString(raw['product_url_key']) ??
        this.toString(raw['productUrlKey']),
      canChangeQty: Boolean(
        raw['can_change_qty'] ?? raw['canChangeQty'] ?? true,
      ),
    };
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

  private parseJsonRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    if (!trimmed.startsWith('{')) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(trimmed);
      return this.asRecord(parsed);
    } catch {
      return undefined;
    }
  }

  private normalizeMediaUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    const mediaOrigin = this.apiConfig.serverOrigin || this.backendOrigin;

    if (!mediaOrigin) {
      return normalizedPath;
    }

    return `${mediaOrigin}${normalizedPath}`;
  }

  /**
   * Centralized error handler for API methods. Logs error and returns fallback result.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      if (error instanceof HttpErrorResponse) {
        return of(result as T);
      }

      this.debugEvents.log('CartApiService', `${operation}:failed`, {
        kind: 'network',
        level: 'error',
        context: { error: error as Record<string, unknown> },
      });
      return of(result as T);
    };
  }
}
