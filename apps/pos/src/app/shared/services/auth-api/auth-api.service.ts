import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  of,
  catchError,
  map,
  switchMap,
  throwError,
  tap,
} from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  ApiMessage,
  Customer,
  CustomerLogin,
  LoginInput,
  RegisterInput,
  UploadAvatarApiResponse,
  UpdateProfileInput,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  success?: boolean;
};

type WebauthnCeremonyOptions = {
  challengeId: number | string;
  publicKey: Record<string, unknown>;
};

type WebauthnRegistrationVerifyPayload = {
  challengeId: number | string;
  credentialId: string;
  response: {
    clientDataJSON?: string;
    attestationObject?: string;
    transports?: string[];
    publicKey?: string;
    publicKeyAlgorithm?: number;
    authenticatorData?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  private get shopApiBase(): string {
    return this.apiConfig.shopApiBase;
  }

  bootstrapCheckoutSession(): Observable<unknown> {
    return this.bootstrapCsrfCookie();
  }

  private bootstrapCsrfCookie(): Observable<unknown> {
    // Note: Don't include credentials on the CSRF bootstrap GET.
    // The backend returns XSRF-TOKEN in a Set-Cookie header, which the browser handles automatically.
    // We only need credentials on the actual POST requests (login, register, etc).
    return this.http
      .get(`${this.apiConfig.backendOrigin}/sanctum/csrf-cookie`)
      .pipe(catchError(() => of(null)));
  }

  login(payload: LoginInput): Observable<CustomerLogin> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/login`,
          payload,
          { withCredentials: true },
        ),
      ),
      map((response) => this.toCustomerLogin(response)),
    );
  }

  webauthnAuthenticateOptions(
    email: string,
  ): Observable<WebauthnCeremonyOptions> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/webauthn/authenticate/options`,
          { email },
          { withCredentials: true },
        ),
      ),
      map((response) => this.toWebauthnOptions(response)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          return throwError(
            () =>
              new Error(this.getPasskeyAuthenticateOptionsErrorMessage(error)),
          );
        }

        return throwError(
          () => new Error('Unable to start passkey authentication.'),
        );
      }),
    );
  }

  webauthnAuthenticateVerify(payload: {
    challengeId: number | string;
    credentialId: string;
    response: {
      clientDataJSON?: string;
      authenticatorData?: string;
      signature?: string;
      userHandle?: string;
    };
  }): Observable<CustomerLogin> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/webauthn/authenticate/verify`,
          {
            challenge_id: payload.challengeId,
            credential_id: payload.credentialId,
            response: payload.response,
          },
          { withCredentials: true },
        ),
      ),
      map((response) => this.toCustomerLogin(response)),
    );
  }

  webauthnRegisterOptions(): Observable<WebauthnCeremonyOptions> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/webauthn/register/options`,
          {},
          { withCredentials: true },
        ),
      ),
      map((response) => this.toWebauthnOptions(response)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          return throwError(
            () => new Error(this.getPasskeyRegisterOptionsErrorMessage(error)),
          );
        }

        return throwError(
          () => new Error('Unable to start passkey registration.'),
        );
      }),
    );
  }

  webauthnRegisterVerify(
    payload: WebauthnRegistrationVerifyPayload,
  ): Observable<ApiMessage> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/webauthn/register/verify`,
          {
            challenge_id: payload.challengeId,
            credential_id: payload.credentialId,
            response: payload.response,
          },
          { withCredentials: true },
        ),
      ),
      map((response) => {
        const source = this.asRecord(response.data ?? response);

        return {
          success:
            response.success ?? this.asBoolean(source['success']) ?? true,
          message:
            this.asString(source['message']) ??
            response.message ??
            'Passkey registered successfully.',
        };
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          return throwError(
            () =>
              new Error(
                this.getHttpErrorMessage(
                  error,
                  'Unable to register passkey. Please try again.',
                ),
              ),
          );
        }

        return throwError(
          () => new Error('Unable to register passkey. Please try again.'),
        );
      }),
    );
  }

  register(payload: RegisterInput): Observable<Customer> {
    const registerPayload = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      phone: payload.phone,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
      subscribedToNewsLetter: payload.subscribedToNewsLetter,
    };

    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.shopApiBase}/customers`,
          registerPayload,
          { withCredentials: true },
        ),
      ),
      map((response) => this.toCustomer(response.data ?? response)),
    );
  }

  logout(_token?: string): Observable<ApiMessage> {
    // Token-based auth: logout is handled client-side by clearing token.
    // No backend session endpoint needed.
    return of({
      success: true,
      message: 'Logged out successfully',
    });
  }

  forgotPassword(email: string): Observable<ApiMessage> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/forgot-password`,
          { email },
          { withCredentials: true },
        ),
      ),
      map((response) => ({
        success: response.success ?? true,
        message: response.message ?? 'Password reset link sent.',
      })),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const payload = this.asRecord(error.error);
          const message =
            this.asString(payload['message']) ??
            this.asString(this.asRecord(payload['errors'])['email']) ??
            error.message ??
            'Unable to send password reset link.';

          return throwError(() => new Error(message));
        }

        return throwError(
          () => new Error('Unable to send password reset link.'),
        );
      }),
    );
  }

  resetPassword(
    token: string,
    password: string,
    passwordConfirmation: string,
  ): Observable<ApiMessage> {
    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.post<ApiEnvelope<unknown>>(
          `${this.apiBase}/customer/reset-password`,
          { token, password, password_confirmation: passwordConfirmation },
          { withCredentials: true },
        ),
      ),
      map((response) => ({
        success: response.success ?? true,
        message: response.message ?? 'Password reset successfully.',
      })),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const payload = this.asRecord(error.error);
          const errorData = this.asRecord(payload['errors']);
          const message =
            this.asString(payload['message']) ??
            this.asString(errorData['token']) ??
            this.asString(errorData['password']) ??
            error.message ??
            'Unable to reset password. Please try again.';

          return throwError(() => new Error(message));
        }

        return throwError(
          () => new Error('Unable to reset password. Please try again.'),
        );
      }),
    );
  }

  getProfile(customerId?: string): Observable<Customer> {
    const endpoint = `${this.apiBase}/customer/profile`;

    return this.http
      .get<unknown>(endpoint, { withCredentials: true })
      .pipe(map((response) => this.toProfileCustomer(response)));
  }

  updateProfile(
    customerId: string,
    payload: UpdateProfileInput,
  ): Observable<ApiMessage> {
    const updatePayload = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      gender: payload.gender,
      dateOfBirth: payload.dateOfBirth,
    };

    return this.bootstrapCsrfCookie().pipe(
      switchMap(() =>
        this.http.put<ApiEnvelope<unknown>>(
          `${this.shopApiBase}/customer-profile-updates/${customerId}`,
          updatePayload,
          { withCredentials: true },
        ),
      ),
      map((response) => {
        const source = this.asRecord(response.data ?? response);
        return {
          success:
            response.success ?? this.asBoolean(source['success']) ?? true,
          message:
            this.asString(source['message']) ??
            response.message ??
            'Profile updated successfully.',
        };
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          return throwError(
            () =>
              new Error(
                this.getHttpErrorMessage(
                  error,
                  'Unable to update profile. Please try again.',
                ),
              ),
          );
        }
        return throwError(
          () => new Error('Unable to update profile. Please try again.'),
        );
      }),
    );
  }

  uploadAvatar(file: File): Observable<UploadAvatarApiResponse> {
    const formData = new FormData();
    formData.append('image', file);

    this.debugEvents.logNetwork('AuthApiService', 'avatar:upload:request', {
      url: `${this.apiBase}/customer/avatar`,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    });

    return this.http
      .post<UploadAvatarApiResponse>(
        `${this.apiBase}/customer/avatar`,
        formData,
      )
      .pipe(
        tap((response) => {
          this.debugEvents.logNetwork(
            'AuthApiService',
            'avatar:upload:response',
            {
              hasData: Boolean(response?.data),
              image: response?.data?.image,
              imageUrl: response?.data?.image_url,
            },
          );
        }),
        map((response) => ({
          ...response,
          data: {
            ...response.data,
            image:
              this.normalizeMediaUrl(response.data?.image) ??
              response.data?.image,
            image_url:
              this.normalizeMediaUrl(response.data?.image_url) ??
              response.data?.image_url,
          },
        })),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            const payload = this.asRecord(error.error);

            this.debugEvents.logNetwork(
              'AuthApiService',
              'avatar:upload:error',
              {
                status: error.status,
                statusText: error.statusText,
                message: error.message,
                apiMessage: this.asString(payload['message']),
                apiErrors: this.asRecord(payload['errors']),
              },
              'error',
            );

            const message =
              this.asString(payload['message']) ??
              error.message ??
              'Unable to upload avatar.';

            return throwError(() => new Error(message));
          }

          this.debugEvents.logNetwork(
            'AuthApiService',
            'avatar:upload:error',
            { error: this.asRecord(error) },
            'error',
          );

          return throwError(() => new Error('Unable to upload avatar.'));
        }),
      );
  }

  private toProfileCustomer(raw: unknown): Customer {
    const source = this.unwrapProfileResponse(raw);

    return this.toCustomer(source);
  }

  private toWebauthnOptions(raw: unknown): WebauthnCeremonyOptions {
    const root = this.asRecord(raw);
    const source = this.asRecord(root['data'] ?? raw);
    const challengeId =
      (source['challenge_id'] as number | string | undefined) ??
      (source['challengeId'] as number | string | undefined);
    const publicKey = this.asRecord(
      source['publicKey'] ?? source['public_key'],
    );

    if (
      (typeof challengeId !== 'string' && typeof challengeId !== 'number') ||
      Object.keys(publicKey).length === 0
    ) {
      throw new Error('Invalid WebAuthn options payload from backend.');
    }

    return {
      challengeId,
      publicKey,
    };
  }

  private toCustomerLogin(raw: unknown): CustomerLogin {
    const source = this.asRecord(
      (this.asRecord(raw)['data'] as unknown) ?? raw,
    ) as any;

    return {
      success: Boolean(source.success ?? true),
      message: this.asString(source.message),
      id: this.asString(source.id),
      token: this.asString(source.token),
      accessToken:
        this.asString(source.access_token) ?? this.asString(source.accessToken),
      apiToken:
        this.asString(source.api_token) ?? this.asString(source.apiToken),
      role: 'customer',
    };
  }

  private toCustomer(raw: unknown): Customer {
    const source = this.asRecord(raw) as any;
    const profile = this.asRecord(
      source.translation ?? source.profile ?? source.customer_profile,
    );
    const image = this.asRecord(source.image ?? profile['image']);

    return {
      id: this.asString(source.id),
      firstName:
        this.asString(source.first_name) ??
        this.asString(source.firstName) ??
        this.asString(profile['first_name']) ??
        this.asString(profile['firstName']) ??
        '',
      lastName:
        this.asString(source.last_name) ??
        this.asString(source.lastName) ??
        this.asString(profile['last_name']) ??
        this.asString(profile['lastName']) ??
        '',
      email:
        this.asString(source.email) ?? this.asString(profile['email']) ?? '',
      phone: this.asString(source.phone) ?? this.asString(profile['phone']),
      dateOfBirth:
        this.asString(source.date_of_birth) ??
        this.asString(source.dateOfBirth) ??
        this.asString(profile['date_of_birth']) ??
        this.asString(profile['dateOfBirth']),
      gender: this.asString(source.gender) ?? this.asString(profile['gender']),
      status: this.asString(source.status) ?? this.asString(profile['status']),
      apiToken:
        this.asString(source.api_token) ?? this.asString(source.apiToken),
      token: this.asString(source.token),
      accessToken:
        this.asString(source.access_token) ?? this.asString(source.accessToken),
      rememberToken:
        this.asString(source.remember_token) ??
        this.asString(source.rememberToken),
      name: this.asString(source.name) ?? this.asString(profile['name']),
      role: 'customer',
      isVerified:
        this.asString(source.is_verified) ??
        this.asString(source.isVerified) ??
        this.asString(profile['is_verified']) ??
        this.asString(profile['isVerified']),
      isSuspended:
        this.asString(source.is_suspended) ??
        this.asString(source.isSuspended) ??
        this.asString(profile['is_suspended']) ??
        this.asString(profile['isSuspended']),
      subscribedToNewsLetter:
        this.asBoolean(source.subscribed_to_news_letter) ??
        this.asBoolean(source.subscribedToNewsLetter) ??
        this.asBoolean(profile['subscribed_to_news_letter']) ??
        this.asBoolean(profile['subscribedToNewsLetter']),
      customerGroupId:
        this.asString(source.customer_group_id) ??
        this.asString(source.customerGroupId) ??
        this.asString(profile['customer_group_id']) ??
        this.asString(profile['customerGroupId']),
      image: this.normalizeMediaUrl(
        this.asString(source.image) ??
          this.asString(image['path']) ??
          this.asString(image['url']),
      ),
      imageUrl: this.normalizeMediaUrl(
        this.asString(source.image_url) ??
          this.asString(source.imageUrl) ??
          this.asString(image['url']) ??
          this.asString(image['path']),
      ),
    };
  }

  private unwrapProfileResponse(raw: unknown): unknown {
    const root = this.asRecord(raw);
    const rootData = root['data'];

    if (Array.isArray(rootData)) {
      return rootData[0] ?? {};
    }

    if (Array.isArray(raw)) {
      return raw[0] ?? {};
    }

    if (rootData && typeof rootData === 'object') {
      return rootData;
    }

    return raw;
  }

  private normalizeMediaUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }

    if (url.startsWith('data:')) {
      return url;
    }

    const backendOrigin = this.apiConfig.backendOrigin;

    try {
      const parsed = new URL(url);

      if (parsed.pathname.startsWith('/storage/')) {
        return `${backendOrigin}${parsed.pathname}${parsed.search}`;
      }

      return parsed.toString();
    } catch {
      const normalizedPath = url.startsWith('/') ? url : `/${url}`;
      return `${backendOrigin}${normalizedPath}`;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private asBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === '1' || value.toLowerCase() === 'true') {
        return true;
      }

      if (value === '0' || value.toLowerCase() === 'false') {
        return false;
      }
    }

    return undefined;
  }

  private getHttpErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    const payload = this.asRecord(error.error);
    const errorData = this.asRecord(payload['errors']);

    return (
      this.asString(payload['message']) ??
      this.asString(errorData['email']) ??
      error.message ??
      fallback
    );
  }

  private getPasskeyAuthenticateOptionsErrorMessage(
    error: HttpErrorResponse,
  ): string {
    const backendMessage = this.getHttpErrorMessage(
      error,
      'Unable to start passkey authentication.',
    );

    if (error.status === 429) {
      const retryAfter = error.headers.get('Retry-After');
      const retryHint = retryAfter
        ? ` Please wait ${retryAfter} seconds and try again.`
        : ' Please wait a moment and try again.';

      return `Too many passkey sign-in attempts.${retryHint}`;
    }

    if (
      error.status === 404 &&
      backendMessage.toLowerCase().includes('no eligible account')
    ) {
      return 'No passkey is registered for this account yet. Sign in with your password first, then register a passkey.';
    }

    return backendMessage;
  }

  private getPasskeyRegisterOptionsErrorMessage(
    error: HttpErrorResponse,
  ): string {
    const backendMessage = this.getHttpErrorMessage(
      error,
      'Unable to start passkey registration.',
    );

    if (error.status === 401) {
      return 'Please sign in before registering a passkey.';
    }

    if (error.status === 409) {
      return 'A passkey is already registered for this account.';
    }

    return backendMessage;
  }
}
