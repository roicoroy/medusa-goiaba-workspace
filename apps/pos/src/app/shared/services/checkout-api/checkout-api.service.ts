import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, tap, throwError } from 'rxjs';

import { catchError, of } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  BagistoCountry,
  BagistoLocale,
  BagistoCountryState,
  CheckoutAddress,
  CheckoutAddressResponse,
  CheckoutOrderResponse,
  CheckoutPaymentMethodResponse,
  CheckoutShippingMethodResponse,
  CreateCustomerAddressInput,
  CreateCheckoutAddressInput,
  PaymentMethod,
  ShippingRate,
  StripeCheckoutConfigResponse,
  StripePaymentIntentResponse,
  StripeSavedCard,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);
  private countriesCacheByLocale: Record<string, BagistoCountry[]> = {};

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  private get shopApiBase(): string {
    return this.apiConfig.shopApiBase;
  }

  getCheckoutSummary(_token?: string): Observable<{
    shippingRates: ShippingRate[];
    paymentMethods: PaymentMethod[];
    redirectUrl?: string;
  }> {
    return this.http
      .get<unknown>(`${this.apiBase}/checkout/onepage/summary`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const payloads = this.collectOnepagePayloadCandidates(root);

          return {
            shippingRates: this.firstShippingRates(payloads),
            paymentMethods: this.firstPaymentMethods(payloads),
            redirectUrl: this.extractCheckoutRedirectUrl(payloads),
          };
        }),
        catchError(
          this.handleError<{
            shippingRates: ShippingRate[];
            paymentMethods: PaymentMethod[];
            redirectUrl?: string;
          }>('getCheckoutSummary', {
            shippingRates: [],
            paymentMethods: [],
          }),
        ),
      );
  }

  getLocales(): Observable<BagistoLocale[]> {
    return this.http.get<unknown>(`${this.shopApiBase}/locales`).pipe(
      map((response) =>
        this.asArray(response).map((entry) => {
          const item = this.asRecord(entry);
          const numericId = this.toNumber(item['id']) ?? 0;
          return {
            id: String(numericId),
            numericId,
            code: this.toString(item['code']) ?? '',
            name: this.toString(item['name']) ?? '',
            direction: this.toString(item['direction']) ?? 'ltr',
          };
        }),
      ),
      catchError(this.handleError<BagistoLocale[]>('getLocales', [])),
    );
  }

  getCountries(locale?: string): Observable<BagistoCountry[]> {
    const normalizedLocale = this.normalizeLocaleCode(locale);
    const cacheKey = normalizedLocale ?? 'default';
    const cached = this.countriesCacheByLocale[cacheKey];

    if (cached) {
      return of(cached);
    }

    return this.http
      .get<unknown>(`${this.apiBase}/checkout/delivery/available-countries`, {
        params: normalizedLocale ? { locale: normalizedLocale } : {},
      })
      .pipe(
        map((response) => this.mapCountriesResponse(response)),
        tap((countries) => {
          this.countriesCacheByLocale[cacheKey] = countries;
        }),
        catchError(this.handleError<BagistoCountry[]>('getCountries', [])),
      );
  }

  private mapCountriesResponse(response: unknown): BagistoCountry[] {
    const root = this.asRecord(response);
    const entries =
      root['data'] !== undefined
        ? this.asArray(root['data'])
        : this.asArray(response);

    return entries.map((entry) => {
      const item = this.asRecord(entry);
      const numericId = this.toNumber(item['id']) ?? 0;

      return {
        id: String(numericId),
        numericId,
        code: this.toString(item['code']) ?? '',
        name: this.toString(item['name']) ?? '',
      };
    });
  }

  getStatesByCountry(
    locale?: string,
  ): Observable<Record<string, BagistoCountryState[]>> {
    const normalizedLocale = this.normalizeLocaleCode(locale);
    const params: Record<string, string> = normalizedLocale
      ? { locale: normalizedLocale }
      : {};

    return this.http
      .get<unknown>(`${this.shopApiBase}/country-states`, { params })
      .pipe(
        map((response) => {
          const parsed: Record<string, BagistoCountryState[]> = {};

          for (const entry of this.asArray(response)) {
            const item = this.asRecord(entry);
            const numericId = this.toNumber(item['id']) ?? 0;
            const countryId =
              this.toNumber(item['countryId']) ??
              this.toNumber(item['country_id']) ??
              0;
            const countryCode =
              this.toString(item['countryCode']) ??
              this.toString(item['country_code']) ??
              '';
            const normalizedCountryCode = countryCode.trim().toUpperCase();
            const state: BagistoCountryState = {
              id: String(numericId),
              numericId,
              code: this.toString(item['code']),
              defaultName:
                this.toString(item['defaultName']) ??
                this.toString(item['default_name']) ??
                '',
              countryId,
              countryCode: normalizedCountryCode || countryCode,
            };

            if (!normalizedCountryCode) {
              continue;
            }

            parsed[normalizedCountryCode] ??= [];
            parsed[normalizedCountryCode].push(state);
          }

          return parsed;
        }),
        catchError(
          this.handleError<Record<string, BagistoCountryState[]>>(
            'getStatesByCountry',
            {},
          ),
        ),
      );
  }

  isAllowedCountry(countryCode: string, countries: BagistoCountry[]): boolean {
    const normalized = this.normalizeCountryCode(countryCode, countries);
    return countries.some((country) => country.code === normalized);
  }

  normalizeLocaleCode(locale: string | null | undefined): string | undefined {
    if (typeof locale !== 'string') {
      return undefined;
    }

    const normalized = locale.trim().toLowerCase();

    if (!normalized) {
      return undefined;
    }

    if (normalized.startsWith('pt')) {
      return 'pt';
    }

    return 'en';
  }

  getCheckoutAddresses(): Observable<CheckoutAddress[]> {
    return this.http.get<unknown>(`${this.apiBase}/customer/addresses`).pipe(
      map((response) => {
        const root = this.asRecord(response);
        return this.asArray(root['data']).map((entry) =>
          this.toCheckoutAddress(this.asRecord(entry)),
        );
      }),
      catchError(
        this.handleError<CheckoutAddress[]>('getCheckoutAddresses', []),
      ),
    );
  }

  getCheckoutShippingRates(_token?: string): Observable<ShippingRate[]> {
    return this.getCheckoutSummary(_token).pipe(
      map((summary) => summary.shippingRates),
      catchError(
        this.handleError<ShippingRate[]>('getCheckoutShippingRates', []),
      ),
    );
  }

  getCheckoutPaymentMethods(_token?: string): Observable<PaymentMethod[]> {
    return this.getCheckoutSummary(_token).pipe(
      map((summary) => summary.paymentMethods),
      catchError(
        this.handleError<PaymentMethod[]>('getCheckoutPaymentMethods', []),
      ),
    );
  }

  saveCheckoutAddress(
    payload: CreateCheckoutAddressInput,
  ): Observable<CheckoutAddressResponse> {
    const countries$ = this.getCountries();

    return countries$.pipe(
      switchMap((countries) => {
        const useForShipping = payload.useForShipping ?? true;
        const billingCountry =
          this.normalizeCountryCode(payload.billingCountry, countries) ||
          payload.billingCountry;

        const billing: Record<string, unknown> = {
          id: payload.billingId,
          address_type: payload.billingAddressType,
          first_name: payload.billingFirstName,
          last_name: payload.billingLastName,
          email: payload.billingEmail,
          address: [payload.billingAddress],
          city: payload.billingCity,
          country: billingCountry,
          state: payload.billingState,
          postcode: payload.billingPostcode,
          phone: payload.billingPhoneNumber,
          company_name: payload.billingCompanyName ?? '',
          use_for_shipping: useForShipping,
        };

        const shippingFromBilling: Record<string, unknown> = {
          id: payload.billingId,
          address_type: payload.billingAddressType,
          first_name: payload.billingFirstName,
          last_name: payload.billingLastName,
          email: payload.billingEmail,
          address: [payload.billingAddress],
          city: payload.billingCity,
          country: billingCountry,
          state: payload.billingState,
          postcode: payload.billingPostcode,
          phone: payload.billingPhoneNumber,
          company_name: payload.billingCompanyName ?? '',
        };

        const body: Record<string, unknown> = {
          billing,
          shipping: shippingFromBilling,
        };

        if (!useForShipping) {
          const shippingCountry =
            this.normalizeCountryCode(
              payload.shippingCountry ?? '',
              countries,
            ) || payload.shippingCountry;

          body['shipping'] = {
            id: payload.shippingId,
            address_type: payload.shippingAddressType,
            first_name: payload.shippingFirstName,
            last_name: payload.shippingLastName,
            email: payload.shippingEmail,
            address: [payload.shippingAddress],
            city: payload.shippingCity,
            country: shippingCountry,
            state: payload.shippingState,
            postcode: payload.shippingPostcode,
            phone: payload.shippingPhoneNumber,
            company_name: payload.shippingCompanyName ?? '',
          };
        }

        this.debugEvents.log(
          'CheckoutApiService',
          'saveCheckoutAddress:request',
          {
            kind: 'network',
            level: 'debug',
            echoToConsole: true,
            context: {
              endpoint: `${this.apiBase}/checkout/onepage/addresses`,
              useForShipping,
              billingFull: billing,
              shippingFull: body['shipping'],
            },
          },
        );

        return this.http.post<unknown>(
          `${this.apiBase}/checkout/onepage/addresses`,
          body,
        );
      }),
      map((response) => {
        const root = this.asRecord(response);
        const payloads = this.collectOnepagePayloadCandidates(root);
        const shippingRates = this.firstShippingRates(payloads);
        const paymentMethods = this.firstPaymentMethods(payloads);
        const redirectUrl = this.extractCheckoutRedirectUrl(payloads);
        const wasSuccessful = root['success'] !== false;

        this.debugEvents.log(
          'CheckoutApiService',
          'saveCheckoutAddress:response',
          {
            kind: 'network',
            level: 'debug',
            echoToConsole: true,
            context: {
              endpoint: `${this.apiBase}/checkout/onepage/addresses`,
              success: wasSuccessful,
              message: this.toString(root['message']),
              shippingCount: shippingRates.length,
              paymentCount: paymentMethods.length,
              redirectUrl,
            },
          },
        );

        return {
          success: wasSuccessful,
          message: this.toString(root['message']),
          shippingRates: wasSuccessful ? shippingRates : [],
          paymentMethods: wasSuccessful ? paymentMethods : [],
          redirectUrl,
        };
      }),
      catchError((error) => {
        const message = this.resolveApiErrorMessage(
          error,
          'Failed to save address',
        );

        this.debugEvents.log(
          'CheckoutApiService',
          'saveCheckoutAddress:error',
          {
            kind: 'network',
            level: 'warn',
            echoToConsole: true,
            context: {
              endpoint: `${this.apiBase}/checkout/onepage/addresses`,
              message,
              error: error as Record<string, unknown>,
            },
          },
        );

        return of<CheckoutAddressResponse>({
          success: false,
          message,
          shippingRates: [],
          paymentMethods: [],
        });
      }),
    );
  }

  saveCustomerAddress(
    payload: CreateCustomerAddressInput,
  ): Observable<CheckoutAddressResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/customer/addresses`, payload)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          return {
            success: true,
            message: this.toString(root['message']),
          };
        }),
        catchError(
          this.handleError<CheckoutAddressResponse>('saveCustomerAddress', {
            success: false,
            message: 'Failed to save customer address',
          }),
        ),
      );
  }

  updateCustomerAddress(
    addressId: string,
    payload: CreateCustomerAddressInput,
  ): Observable<CheckoutAddressResponse> {
    const body = {
      ...payload,
      id: addressId,
    };

    return this.http
      .put<unknown>(
        `${this.apiBase}/customer/addresses/edit/${addressId}`,
        body,
      )
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          return {
            success: true,
            message: this.toString(root['message']),
          };
        }),
        catchError(
          this.handleError<CheckoutAddressResponse>('updateCustomerAddress', {
            success: false,
            message: 'Failed to update customer address',
          }),
        ),
      );
  }

  deleteCustomerAddress(
    addressId: string,
  ): Observable<CheckoutAddressResponse> {
    return this.http
      .delete<unknown>(
        `${this.apiBase}/customer/addresses/${encodeURIComponent(addressId)}`,
      )
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          return {
            success: true,
            message: this.toString(root['message']),
          };
        }),
        catchError(
          this.handleError<CheckoutAddressResponse>('deleteCustomerAddress', {
            success: false,
            message: 'Failed to delete address',
          }),
        ),
      );
  }

  saveCheckoutShippingMethod(
    shippingMethod: string,
  ): Observable<CheckoutShippingMethodResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/checkout/onepage/shipping-methods`, {
        shipping_method: shippingMethod,
      })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const payloads = this.collectOnepagePayloadCandidates(root);
          const paymentMethods = this.firstPaymentMethods(payloads);
          return {
            success: true,
            id: this.toString(root['id']),
            paymentMethods,
          };
        }),
        catchError(
          this.handleError<CheckoutShippingMethodResponse>(
            'saveCheckoutShippingMethod',
            { success: false, id: '', paymentMethods: [] },
          ),
        ),
      );
  }

  saveCheckoutPaymentMethod(payload: {
    paymentMethod: string;
    successUrl?: string;
    failureUrl?: string;
    cancelUrl?: string;
  }): Observable<CheckoutPaymentMethodResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/checkout/onepage/payment-methods`, {
        payment: {
          method: payload.paymentMethod,
        },
        success_url: payload.successUrl,
        failure_url: payload.failureUrl,
        cancel_url: payload.cancelUrl,
      })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          return {
            success: true,
            paymentGatewayUrl: this.toString(root['redirect_url']),
          };
        }),
        catchError(
          this.handleError<CheckoutPaymentMethodResponse>(
            'saveCheckoutPaymentMethod',
            { success: false, paymentGatewayUrl: '' },
          ),
        ),
      );
  }

  placeOrder(): Observable<CheckoutOrderResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/checkout/onepage/orders`, {})
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const wasSuccessful = root['success'] !== false;

          return {
            success: wasSuccessful,
            message: this.toString(root['message']),
            id: wasSuccessful ? this.toString(root['order_id']) : undefined,
            orderId: wasSuccessful
              ? this.toString(root['order_id'])
              : undefined,
            orderIncrementId: wasSuccessful
              ? this.toString(root['order_increment_id'])
              : undefined,
          };
        }),
        catchError(
          this.handleError<CheckoutOrderResponse>('placeOrder', {
            success: false,
            message: 'Failed to place order',
          }),
        ),
      );
  }

  getStripeConfig(): Observable<StripeCheckoutConfigResponse> {
    return this.http
      .get<unknown>(`${this.apiBase}/checkout/onepage/stripe/config`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          if (root['success'] === false) {
            throw new Error(
              this.toString(root['message']) || 'Failed to load Stripe config.',
            );
          }

          const publishableKey = this.toString(root['publishable_key']);

          if (!publishableKey) {
            throw new Error(
              'Stripe publishable key is missing in server configuration.',
            );
          }

          return {
            success: true,
            publishableKey,
            paymentMethod: this.toString(root['payment_method']),
            acceptedCurrencies: this.asArray(root['accepted_currencies'])
              .map((entry) => this.toString(entry))
              .filter((entry): entry is string => Boolean(entry)),
          };
        }),
        catchError((error) =>
          throwError(
            () =>
              new Error(
                this.resolveApiErrorMessage(
                  error,
                  'Failed to load Stripe config.',
                ),
              ),
          ),
        ),
      );
  }

  createStripePaymentIntent(
    options: { saveCard?: boolean; paymentMethodId?: string } = {},
  ): Observable<StripePaymentIntentResponse> {
    const body: Record<string, unknown> = {};

    if (options.saveCard) {
      body['save_card'] = true;
    }

    if (options.paymentMethodId) {
      body['payment_method_id'] = options.paymentMethodId;
    }

    return this.http
      .post<unknown>(
        `${this.apiBase}/checkout/onepage/stripe/payment-intents`,
        body,
      )
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          if (root['success'] === false) {
            throw new Error(
              this.toString(root['message']) ||
                'Failed to create Stripe payment intent.',
            );
          }

          const publishableKey = this.toString(root['publishable_key']);
          const clientSecret = this.toString(root['client_secret']);

          if (!publishableKey || !clientSecret) {
            throw new Error(
              'Stripe checkout initialization failed: publishable key or client secret is missing.',
            );
          }

          return {
            success: true,
            paymentMethod: this.toString(root['payment_method']),
            publishableKey,
            paymentIntentId: this.toString(root['payment_intent_id']),
            clientSecret,
            amount: this.toNumber(root['amount']),
            currency: this.toString(root['currency']),
            status: this.toString(root['status']),
          };
        }),
        catchError((error) =>
          throwError(
            () =>
              new Error(
                this.resolveApiErrorMessage(
                  error,
                  'Failed to create Stripe payment intent.',
                ),
              ),
          ),
        ),
      );
  }

  getSavedCards(): Observable<StripeSavedCard[]> {
    return this.http
      .get<unknown>(`${this.apiBase}/checkout/onepage/stripe/saved-cards`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          return this.asArray(root['data']).map((entry) => {
            const item = this.asRecord(entry);
            return {
              id: this.toString(item['id']) ?? '',
              brand: this.toString(item['brand']) ?? '',
              last4: this.toString(item['last4']) ?? '',
              expMonth: this.toNumber(item['exp_month']) ?? 0,
              expYear: this.toNumber(item['exp_year']) ?? 0,
              funding: this.toString(item['funding']) ?? '',
            };
          });
        }),
        catchError(this.handleError<StripeSavedCard[]>('getSavedCards', [])),
      );
  }

  deleteSavedCard(paymentMethodId: string): Observable<{ success: boolean }> {
    return this.http
      .delete<unknown>(
        `${this.apiBase}/checkout/onepage/stripe/saved-cards/${encodeURIComponent(paymentMethodId)}`,
      )
      .pipe(
        map(() => ({ success: true })),
        catchError(
          this.handleError<{ success: boolean }>('deleteSavedCard', {
            success: false,
          }),
        ),
      );
  }

  confirmStripeOrder(
    paymentIntentId: string,
  ): Observable<CheckoutOrderResponse> {
    return this.http
      .post<unknown>(`${this.apiBase}/checkout/onepage/stripe/orders`, {
        payment_intent_id: paymentIntentId,
      })
      .pipe(
        map((response) => {
          const root = this.asRecord(response);

          if (root['success'] === false) {
            throw new Error(
              this.toString(root['message']) ||
                'Failed to confirm Stripe order.',
            );
          }

          return {
            success: true,
            id: this.toString(root['order_id']),
            orderId: this.toString(root['order_id']),
            orderIncrementId: this.toString(root['increment_id']),
            status: this.toString(root['status']),
          };
        }),
        catchError((error) =>
          throwError(
            () =>
              new Error(
                this.resolveApiErrorMessage(
                  error,
                  'Failed to confirm Stripe order.',
                ),
              ),
          ),
        ),
      );
  }

  /**
   * Centralized error handler for API methods. Logs error and returns fallback result.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      if (error instanceof HttpErrorResponse) {
        return of(result as T);
      }

      this.debugEvents.log('CheckoutApiService', `${operation}:failed`, {
        kind: 'network',
        level: 'error',
        context: { error: error as Record<string, unknown> },
      });
      return of(result as T);
    };
  }

  private toCheckoutAddress(raw: Record<string, unknown>): CheckoutAddress {
    const address = this.asArray(raw['address'])
      .map((entry) => this.toString(entry))
      .filter((entry): entry is string => Boolean(entry))
      .join(', ');

    return {
      id: this.toString(raw['id']) ?? '',
      addressType: this.toString(raw['address_type']),
      firstName: this.toString(raw['first_name']) ?? '',
      lastName: this.toString(raw['last_name']) ?? '',
      companyName: this.toString(raw['company_name']),
      address,
      city: this.toString(raw['city']) ?? '',
      state: this.toString(raw['state']),
      country: this.toString(raw['country']),
      countryCode: this.toString(raw['country_code']),
      postcode: this.toString(raw['postcode']),
      email: this.toString(raw['email']),
      phone: this.toString(raw['phone']),
      defaultAddress: Boolean(raw['default_address']),
      useForShipping: Boolean(raw['use_for_shipping']),
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
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private normalizeCountryCode(
    value: string,
    countries: BagistoCountry[],
  ): string {
    const raw = value.trim();

    if (!raw) {
      return '';
    }

    const byExactCode = countries.find((country) => country.code === raw);

    if (byExactCode) {
      return byExactCode.code;
    }

    const upperRaw = raw.toUpperCase();
    const byUpperCode = countries.find(
      (country) => country.code.toUpperCase() === upperRaw,
    );

    if (byUpperCode) {
      return byUpperCode.code;
    }

    const lowerRaw = raw.toLowerCase();
    const byName = countries.find(
      (country) => country.name.toLowerCase() === lowerRaw,
    );

    if (byName) {
      return byName.code;
    }

    // Accept labels that may include metadata (e.g. "United Kingdom (GB)").
    const embeddedCodeMatch = upperRaw.match(/\b[A-Z]{2}\b/);
    const embeddedCode = embeddedCodeMatch?.[0];

    if (embeddedCode) {
      const byEmbeddedCode = countries.find(
        (country) => country.code.toUpperCase() === embeddedCode,
      );

      if (byEmbeddedCode) {
        return byEmbeddedCode.code;
      }
    }

    const normalizeForCompare = (input: string): string =>
      input
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const normalizedRaw = normalizeForCompare(raw);

    if (!normalizedRaw) {
      return raw;
    }

    const byNormalizedName = countries.find(
      (country) => normalizeForCompare(country.name) === normalizedRaw,
    );

    if (byNormalizedName) {
      return byNormalizedName.code;
    }

    const byLooseName = countries.find((country) => {
      const normalizedName = normalizeForCompare(country.name);

      return (
        normalizedName.includes(normalizedRaw) ||
        normalizedRaw.includes(normalizedName)
      );
    });

    if (byLooseName) {
      return byLooseName.code;
    }

    return raw;
  }

  private locationQueryString(locale?: string): string {
    const query = new URLSearchParams({
      shipping_only: '1',
    });

    if (locale) {
      query.set('locale', locale);
    }

    return query.toString();
  }

  private resolveApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = this.asRecord(error.error);
      const directMessage = this.toString(body['message']);

      if (directMessage) {
        return directMessage;
      }

      const errors = this.asRecord(body['errors']);
      const firstEntry = Object.values(errors)[0];

      if (
        Array.isArray(firstEntry) &&
        firstEntry.length > 0 &&
        typeof firstEntry[0] === 'string'
      ) {
        return firstEntry[0];
      }

      if (typeof firstEntry === 'string') {
        return firstEntry;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  private parseShippingRatesFromOnepage(
    data: Record<string, unknown>,
  ): ShippingRate[] {
    const rawShipping =
      data['shippingMethods'] ??
      data['shipping_methods'] ??
      data['shipping'] ??
      data['rates'];
    const groups = rawShipping
      ? Array.isArray(rawShipping)
        ? rawShipping
        : Object.values(this.asRecord(rawShipping))
      : this.directShippingGroups(data);

    if (groups.length === 0) {
      return [];
    }

    const result: ShippingRate[] = [];

    for (const groupEntry of groups) {
      const group = this.asRecord(groupEntry);
      const rates = this.asArray(group['rates']);

      if (rates.length > 0) {
        for (const rateEntry of rates) {
          const rate = this.asRecord(rateEntry);
          const method =
            this.toString(rate['method']) ?? this.toString(rate['code']) ?? '';

          result.push({
            id: method,
            code: this.toString(rate['code']) ?? method,
            label:
              this.toString(rate['carrier_title']) ??
              this.toString(rate['method_title']) ??
              method,
            description:
              this.toString(rate['method_description']) ??
              this.toString(rate['description']),
            method,
            methodTitle: this.toString(rate['method_title']),
            price:
              this.toNumber(rate['price']) ?? this.toNumber(rate['base_price']),
            formattedPrice:
              this.toString(rate['formatted_price']) ??
              this.toString(rate['base_formatted_price']),
            carrier: this.toString(rate['carrier']),
            carrierTitle: this.toString(rate['carrier_title']),
          });
        }

        continue;
      }

      const method =
        this.toString(group['method']) ?? this.toString(group['code']) ?? '';

      if (!method) {
        continue;
      }

      result.push({
        id: method,
        code: this.toString(group['code']) ?? method,
        label:
          this.toString(group['carrier_title']) ??
          this.toString(group['method_title']) ??
          method,
        description:
          this.toString(group['method_description']) ??
          this.toString(group['description']),
        method,
        methodTitle: this.toString(group['method_title']),
        price:
          this.toNumber(group['price']) ?? this.toNumber(group['base_price']),
        formattedPrice:
          this.toString(group['formatted_price']) ??
          this.toString(group['base_formatted_price']),
        carrier: this.toString(group['carrier']),
        carrierTitle: this.toString(group['carrier_title']),
      });
    }

    return result;
  }

  private parsePaymentMethodsFromOnepage(
    data: Record<string, unknown>,
  ): PaymentMethod[] {
    const rawMethods =
      data['payment_methods'] ??
      data['paymentMethods'] ??
      data['payments'] ??
      data['payment'];
    const methods = rawMethods
      ? Array.isArray(rawMethods)
        ? rawMethods
        : Object.values(this.asRecord(rawMethods))
      : this.directPaymentMethods(data);

    if (methods.length === 0) {
      return [];
    }

    return methods.reduce<PaymentMethod[]>((acc, entry) => {
      const method = this.asRecord(entry);
      const methodCode =
        this.toString(method['method']) ??
        this.toString(method['payment']) ??
        '';

      if (!methodCode) {
        return acc;
      }

      acc.push({
        id: methodCode,
        method: methodCode,
        title:
          this.toString(method['method_title']) ??
          this.toString(method['title']),
        description: this.toString(method['description']),
        isAllowed: true,
      });

      return acc;
    }, []);
  }

  private collectOnepagePayloadCandidates(
    root: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const data = this.asRecord(root['data']);
    const nested = this.asRecord(data['data']);
    const fromRoot = this.collectNestedRecords(root, 3);
    const fromData = this.collectNestedRecords(data, 3);
    const fromNested = this.collectNestedRecords(nested, 3);

    const all = [root, data, nested, ...fromRoot, ...fromData, ...fromNested];
    const seen = new Set<Record<string, unknown>>();

    return all.filter((entry) => {
      if (Object.keys(entry).length === 0) {
        return false;
      }

      if (seen.has(entry)) {
        return false;
      }

      seen.add(entry);
      return true;
    });
  }

  private collectNestedRecords(
    input: Record<string, unknown>,
    depth: number,
  ): Record<string, unknown>[] {
    if (depth <= 0 || Object.keys(input).length === 0) {
      return [];
    }

    const result: Record<string, unknown>[] = [];

    for (const value of Object.values(input)) {
      const record = this.asRecord(value);

      if (Object.keys(record).length > 0) {
        result.push(record);
        result.push(...this.collectNestedRecords(record, depth - 1));
      }

      for (const entry of this.asArray(value)) {
        const entryRecord = this.asRecord(entry);

        if (Object.keys(entryRecord).length > 0) {
          result.push(entryRecord);
          result.push(...this.collectNestedRecords(entryRecord, depth - 1));
        }
      }
    }

    return result;
  }

  private firstShippingRates(
    payloads: Record<string, unknown>[],
  ): ShippingRate[] {
    for (const payload of payloads) {
      const rates = this.parseShippingRatesFromOnepage(payload);

      if (rates.length > 0) {
        return rates;
      }
    }

    return [];
  }

  private firstPaymentMethods(
    payloads: Record<string, unknown>[],
  ): PaymentMethod[] {
    for (const payload of payloads) {
      const methods = this.parsePaymentMethodsFromOnepage(payload);

      if (methods.length > 0) {
        return methods;
      }
    }

    return [];
  }

  private extractCheckoutRedirectUrl(
    payloads: Record<string, unknown>[],
  ): string | undefined {
    for (const payload of payloads) {
      const redirectUrl =
        this.toString(payload['redirect_url']) ??
        this.toString(payload['redirectUrl']) ??
        this.toString(payload['redirect']);

      if (redirectUrl) {
        return redirectUrl;
      }
    }

    return undefined;
  }

  private directShippingGroups(data: Record<string, unknown>): unknown[] {
    const candidates = Object.values(data).filter((entry) =>
      this.looksLikeShippingRateGroup(entry),
    );

    return candidates;
  }

  private directPaymentMethods(data: Record<string, unknown>): unknown[] {
    const candidates = Object.values(data).filter((entry) =>
      this.looksLikePaymentMethod(entry),
    );

    return candidates;
  }

  private looksLikeShippingRateGroup(value: unknown): boolean {
    const group = this.asRecord(value);

    if (Object.keys(group).length === 0) {
      return false;
    }

    if (this.asArray(group['rates']).length > 0) {
      return true;
    }

    return Boolean(
      this.toString(group['method']) ||
      this.toString(group['code']) ||
      this.toString(group['carrier']),
    );
  }

  private looksLikePaymentMethod(value: unknown): boolean {
    const method = this.asRecord(value);

    if (Object.keys(method).length === 0) {
      return false;
    }

    return Boolean(
      this.toString(method['method']) ||
      this.toString(method['payment']) ||
      this.toString(method['method_title']),
    );
  }
}
