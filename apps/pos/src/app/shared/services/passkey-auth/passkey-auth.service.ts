import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorPasskey } from '@capgo/capacitor-passkey';
import { from, map, Observable, switchMap } from 'rxjs';

import { ApiMessage, CustomerLogin } from '@org/storefront-models';
import { BagistoApiConfigService } from '../../api/api-base-url';
import { AuthApiService } from '../auth-api/auth-api.service';
import { DebugEventsService } from '../debug-events/debug-events.service';

type WebauthnCredential = {
  id: string;
  rawId?: string;
  response: Record<string, string | undefined>;
  type?: string;
};

type WebauthnRegistrationCredential = {
  id: string;
  rawId?: string;
  response: {
    clientDataJSON?: string;
    attestationObject?: string;
    transports?: string[];
    publicKey?: string;
    publicKeyAlgorithm?: number;
    authenticatorData?: string;
  };
  type?: string;
};

@Injectable({ providedIn: 'root' })
export class PasskeyAuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly debugEvents = inject(DebugEventsService);
  private readonly apiConfig = inject(BagistoApiConfigService);

  authenticateWithPasskey(email: string): Observable<CustomerLogin> {
    return this.authApi.webauthnAuthenticateOptions(email).pipe(
      switchMap(({ challengeId, publicKey }) =>
        from(this.getCredentialWithFallback(publicKey)).pipe(
          map((credential) => ({ challengeId, credential })),
        ),
      ),
      switchMap(({ challengeId, credential }) => {
        const credentialId = credential.id || credential.rawId;

        if (!credentialId) {
          throw new Error(
            'Passkey authentication returned an invalid credential payload (missing id/rawId).',
          );
        }

        return this.authApi.webauthnAuthenticateVerify({
          challengeId,
          credentialId,
          response: {
            clientDataJSON: credential.response['clientDataJSON'],
            authenticatorData: credential.response['authenticatorData'],
            signature: credential.response['signature'],
            userHandle: credential.response['userHandle'],
          },
        });
      }),
    );
  }

  registerPasskey(): Observable<ApiMessage> {
    return this.authApi.webauthnRegisterOptions().pipe(
      switchMap(({ challengeId, publicKey }) =>
        from(this.createCredentialWithFallback(publicKey)).pipe(
          map((credential) => ({ challengeId, credential })),
        ),
      ),
      switchMap(({ challengeId, credential }) => {
        const credentialId = credential.id || credential.rawId;

        if (!credentialId) {
          throw new Error(
            'Passkey registration returned an invalid credential payload (missing id/rawId).',
          );
        }

        return this.authApi.webauthnRegisterVerify({
          challengeId,
          credentialId,
          response: {
            clientDataJSON: credential.response.clientDataJSON,
            attestationObject: credential.response.attestationObject,
            transports: credential.response.transports,
            publicKey: credential.response.publicKey,
            publicKeyAlgorithm: credential.response.publicKeyAlgorithm,
            authenticatorData: credential.response.authenticatorData,
          },
        });
      }),
    );
  }

  private async getCredentialWithFallback(
    publicKey: Record<string, unknown>,
  ): Promise<WebauthnCredential> {
    if (!this.isNativePlatform()) {
      return this.getCredential(publicKey);
    }

    this.debugEvents.log(
      'PasskeyAuthService',
      'login:getCredentialWithFallback:native-first',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
      },
    );

    try {
      return await this.getCredentialNative(publicKey);
    } catch (nativeError) {
      this.debugEvents.log(
        'PasskeyAuthService',
        'login:getCredentialWithFallback:native-failed',
        {
          kind: 'application',
          level: 'warn',
          echoToConsole: true,
          context: {
            error:
              nativeError instanceof Error
                ? { name: nativeError.name, message: nativeError.message }
                : nativeError,
          },
        },
      );

      this.debugEvents.log(
        'PasskeyAuthService',
        'login:getCredentialWithFallback:shim-second',
        {
          kind: 'application',
          level: 'debug',
          echoToConsole: true,
        },
      );

      return this.getCredential(publicKey);
    }
  }

  private async createCredentialWithFallback(
    publicKey: Record<string, unknown>,
  ): Promise<WebauthnRegistrationCredential> {
    if (!this.isNativePlatform()) {
      return this.createCredential(publicKey);
    }

    this.debugEvents.log(
      'PasskeyAuthService',
      'register:createCredentialWithFallback:native-first',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
      },
    );

    try {
      return await this.createCredentialNative(publicKey);
    } catch (nativeError) {
      this.debugEvents.log(
        'PasskeyAuthService',
        'register:createCredentialWithFallback:native-failed',
        {
          kind: 'application',
          level: 'warn',
          echoToConsole: true,
          context: {
            error:
              nativeError instanceof Error
                ? { name: nativeError.name, message: nativeError.message }
                : nativeError,
          },
        },
      );

      this.debugEvents.log(
        'PasskeyAuthService',
        'register:createCredentialWithFallback:shim-second',
        {
          kind: 'application',
          level: 'debug',
          echoToConsole: true,
        },
      );

      return this.createCredential(publicKey);
    }
  }

  private async getCredential(
    publicKey: Record<string, unknown>,
  ): Promise<WebauthnCredential> {
    const input = this.toRequestOptions(publicKey);

    this.debugEvents.log('PasskeyAuthService', 'login:getCredential:start', {
      kind: 'application',
      level: 'debug',
      echoToConsole: true,
    });

    const runCredentialRequest = (
      options: CredentialRequestOptions,
    ): Promise<Credential | null> =>
      this.withTimeout(
        navigator.credentials.get(options),
        30000,
        'Passkey authentication timed out. Please try again.',
      );

    let credential: Credential | null;

    try {
      credential = await runCredentialRequest(input);
    } catch (credentialError) {
      const errorMessage =
        credentialError instanceof Error ? credentialError.message : '';
      const requestPublicKey = input.publicKey;
      const hasAllowCredentials =
        !!requestPublicKey?.allowCredentials &&
        requestPublicKey.allowCredentials.length > 0;
      const shouldRetryWithoutAllowCredentials =
        hasAllowCredentials &&
        errorMessage.includes(
          "Cannot read properties of undefined (reading 'id')",
        );

      if (!shouldRetryWithoutAllowCredentials) {
        throw credentialError;
      }

      if (!requestPublicKey?.challenge) {
        throw credentialError;
      }

      const fallbackInput: CredentialRequestOptions = {
        publicKey: {
          challenge: requestPublicKey.challenge,
          rpId: requestPublicKey.rpId,
          timeout: requestPublicKey.timeout,
          userVerification: requestPublicKey.userVerification,
          extensions: requestPublicKey.extensions,
        },
      };

      this.debugEvents.log(
        'PasskeyAuthService',
        'login:getCredential:retry-without-allowCredentials',
        {
          kind: 'application',
          level: 'warn',
          echoToConsole: true,
          context: {
            reason: errorMessage,
            originalAllowCredentialsCount:
              requestPublicKey.allowCredentials?.length,
          },
        },
      );

      credential = await runCredentialRequest(fallbackInput);
    }

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error('Passkey authentication returned an invalid credential.');
    }

    const response = credential.response;

    if (!(response instanceof AuthenticatorAssertionResponse)) {
      throw new Error('Passkey authentication response is not assertion data.');
    }

    return {
      id: credential.id,
      rawId: this.toBase64Url(credential.rawId),
      response: {
        clientDataJSON: this.toBase64Url(response.clientDataJSON),
        authenticatorData: this.toBase64Url(response.authenticatorData),
        signature: this.toBase64Url(response.signature),
        userHandle: response.userHandle
          ? this.toBase64Url(response.userHandle)
          : undefined,
      },
      type: credential.type,
    };
  }

  private async getCredentialNative(
    publicKey: Record<string, unknown>,
  ): Promise<WebauthnCredential> {
    const nativePublicKey = this.toNativeRequestPublicKey(publicKey);

    this.debugEvents.log(
      'PasskeyAuthService',
      'login:getCredentialNative:start',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
        context: {
          origin: this.apiConfig.serverOrigin,
          hasAllowCredentials: Array.isArray(
            nativePublicKey['allowCredentials'],
          ),
          allowCredentialsCount: Array.isArray(
            nativePublicKey['allowCredentials'],
          )
            ? nativePublicKey['allowCredentials'].length
            : 0,
        },
      },
    );

    const runNativeCredentialRequest = (
      requestPublicKey: Record<string, unknown>,
    ): Promise<unknown> =>
      this.withTimeout(
        CapacitorPasskey.getCredential({
          origin: this.apiConfig.serverOrigin,
          mediation: 'optional',
          publicKey: requestPublicKey as {
            challenge: string;
            rpId?: string;
            timeout?: number;
            allowCredentials?: Array<{
              id: string;
              type?: 'public-key';
              transports?: string[];
            }>;
            userVerification?: 'discouraged' | 'preferred' | 'required';
          },
        }),
        30000,
        'Passkey authentication timed out. Please try again.',
      );

    let rawCredential: unknown;

    try {
      rawCredential = await runNativeCredentialRequest(nativePublicKey);
    } catch (nativeRequestError) {
      const nativeMessage =
        nativeRequestError instanceof Error ? nativeRequestError.message : '';
      const hasAllowCredentials = Array.isArray(
        nativePublicKey['allowCredentials'],
      );
      const shouldRetryWithoutAllowCredentials =
        hasAllowCredentials &&
        nativeMessage.includes(
          "Cannot read properties of undefined (reading 'id')",
        );

      if (!shouldRetryWithoutAllowCredentials) {
        throw nativeRequestError;
      }

      const { allowCredentials: _ignored, ...fallbackPublicKey } =
        nativePublicKey;

      this.debugEvents.log(
        'PasskeyAuthService',
        'login:getCredentialNative:retry-without-allowCredentials',
        {
          kind: 'application',
          level: 'warn',
          echoToConsole: true,
          context: {
            reason: nativeMessage,
            originalAllowCredentialsCount: Array.isArray(
              nativePublicKey['allowCredentials'],
            )
              ? nativePublicKey['allowCredentials'].length
              : 0,
          },
        },
      );

      rawCredential = await runNativeCredentialRequest(fallbackPublicKey);
    }

    const rawCredentialRecord = this.asRecord(rawCredential);
    const rawCredentialNested = this.asRecord(
      rawCredentialRecord['credential'],
    );
    const rawCredentialResponse = this.asRecord(
      rawCredentialRecord['response'],
    );
    const rawCredentialNestedResponse = this.asRecord(
      rawCredentialNested['response'],
    );
    const rawCredentialJson = (() => {
      try {
        return JSON.stringify(rawCredential);
      } catch {
        return undefined;
      }
    })();

    this.debugEvents.log(
      'PasskeyAuthService',
      'login:getCredentialNative:plugin-response',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
        context: {
          rootKeys: Object.keys(rawCredentialRecord),
          nestedCredentialKeys: Object.keys(rawCredentialNested),
          responseKeys: Object.keys(rawCredentialResponse),
          nestedResponseKeys: Object.keys(rawCredentialNestedResponse),
          rawCredential,
          rawCredentialJson,
        },
      },
    );

    const credential = this.normalizeNativeCredential(rawCredential);

    this.debugEvents.log(
      'PasskeyAuthService',
      'login:getCredentialNative:normalized',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
        context: {
          hasId: !!credential.id,
          hasRawId: !!credential.rawId,
          responseKeys: Object.keys(credential.response),
        },
      },
    );

    return credential;
  }

  private async createCredential(
    publicKey: Record<string, unknown>,
  ): Promise<WebauthnRegistrationCredential> {
    const input = this.toRegistrationCreationOptions(publicKey);

    this.debugEvents.log(
      'PasskeyAuthService',
      'register:createCredential:start',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
      },
    );

    const credential = await this.withTimeout(
      navigator.credentials.create(input),
      30000,
      'Passkey registration timed out. Please try again.',
    );

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error('Passkey registration returned an invalid credential.');
    }

    const response = credential.response;

    if (!(response instanceof AuthenticatorAttestationResponse)) {
      throw new Error('Passkey registration response is not attestation data.');
    }

    const transports =
      typeof response.getTransports === 'function'
        ? response.getTransports()
        : undefined;
    const publicKeyBuffer =
      typeof response.getPublicKey === 'function'
        ? response.getPublicKey()
        : null;
    const publicKeyAlgorithm =
      typeof response.getPublicKeyAlgorithm === 'function'
        ? response.getPublicKeyAlgorithm()
        : undefined;

    return {
      id: credential.id,
      rawId: this.toBase64Url(credential.rawId),
      response: {
        clientDataJSON: this.toBase64Url(response.clientDataJSON),
        attestationObject: this.toBase64Url(response.attestationObject),
        transports,
        publicKey: publicKeyBuffer
          ? this.toBase64Url(publicKeyBuffer)
          : undefined,
        publicKeyAlgorithm,
      },
      type: credential.type,
    };
  }

  private async createCredentialNative(
    publicKey: Record<string, unknown>,
  ): Promise<WebauthnRegistrationCredential> {
    const nativePublicKey = this.toNativeRegistrationPublicKey(publicKey);

    this.debugEvents.log(
      'PasskeyAuthService',
      'register:createCredentialNative:start',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
        context: {
          origin: this.apiConfig.serverOrigin,
          hasExcludeCredentials: Array.isArray(
            nativePublicKey['excludeCredentials'],
          ),
        },
      },
    );

    const rawCredential = await this.withTimeout(
      CapacitorPasskey.createCredential({
        origin: this.apiConfig.serverOrigin,
        publicKey: nativePublicKey as {
          challenge: string;
          rp: {
            name: string;
            id?: string;
          };
          user: {
            id: string;
            name: string;
            displayName?: string;
          };
          pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
          timeout?: number;
          excludeCredentials?: Array<{
            id: string;
            type?: 'public-key';
            transports?: string[];
          }>;
        },
      }),
      30000,
      'Passkey registration timed out. Please try again.',
    );

    const rawCredentialRecord = this.asRecord(rawCredential);
    const rawCredentialNested = this.asRecord(
      rawCredentialRecord['credential'],
    );
    const rawCredentialResponse = this.asRecord(
      rawCredentialRecord['response'],
    );
    const rawCredentialNestedResponse = this.asRecord(
      rawCredentialNested['response'],
    );

    this.debugEvents.log(
      'PasskeyAuthService',
      'register:createCredentialNative:plugin-response',
      {
        kind: 'application',
        level: 'debug',
        echoToConsole: true,
        context: {
          rootKeys: Object.keys(rawCredentialRecord),
          nestedCredentialKeys: Object.keys(rawCredentialNested),
          responseKeys: Object.keys(rawCredentialResponse),
          nestedResponseKeys: Object.keys(rawCredentialNestedResponse),
        },
      },
    );

    return this.normalizeNativeRegistrationCredential(rawCredential);
  }

  private normalizeNativeCredential(raw: unknown): WebauthnCredential {
    const root = this.asRecord(raw);
    const nestedCredential = this.asRecord(root['credential']);
    const response = this.asRecord(root['response']);
    const nestedResponse = this.asRecord(nestedCredential['response']);

    const id =
      this.asString(root['id']) ??
      this.asString(root['credentialId']) ??
      this.asString(nestedCredential['id']) ??
      this.asString(nestedCredential['credentialId']) ??
      this.asString(root['rawId']) ??
      this.asString(root['raw_id']) ??
      this.asString(nestedCredential['rawId']) ??
      this.asString(nestedCredential['raw_id']);

    if (!id) {
      this.debugEvents.log(
        'PasskeyAuthService',
        'login:getCredentialNative:invalid-payload',
        {
          kind: 'application',
          level: 'warn',
          echoToConsole: true,
          context: {
            rootKeys: Object.keys(root),
            nestedCredentialKeys: Object.keys(nestedCredential),
          },
        },
      );

      throw new Error(
        'Passkey authentication returned an invalid credential payload (missing id).',
      );
    }

    return {
      id,
      rawId:
        this.asString(root['rawId']) ??
        this.asString(root['raw_id']) ??
        this.asString(nestedCredential['rawId']) ??
        this.asString(nestedCredential['raw_id']),
      response: {
        clientDataJSON:
          this.asString(response['clientDataJSON']) ??
          this.asString(response['client_data_json']) ??
          this.asString(nestedResponse['clientDataJSON']) ??
          this.asString(nestedResponse['client_data_json']),
        authenticatorData:
          this.asString(response['authenticatorData']) ??
          this.asString(response['authenticator_data']) ??
          this.asString(nestedResponse['authenticatorData']) ??
          this.asString(nestedResponse['authenticator_data']),
        signature:
          this.asString(response['signature']) ??
          this.asString(nestedResponse['signature']),
        userHandle:
          this.asString(response['userHandle']) ??
          this.asString(response['user_handle']) ??
          this.asString(nestedResponse['userHandle']) ??
          this.asString(nestedResponse['user_handle']) ??
          undefined,
      },
      type:
        this.asString(root['type']) ??
        this.asString(nestedCredential['type']) ??
        'public-key',
    };
  }

  private toRequestOptions(
    publicKey: Record<string, unknown>,
  ): CredentialRequestOptions {
    const rawChallenge = this.asString(publicKey['challenge']);
    const rawAllowCredentials =
      publicKey['allowCredentials'] ?? publicKey['allow_credentials'];
    const rawRpId = this.asString(publicKey['rpId'] ?? publicKey['rp_id']);
    const rawUserVerification = this.asString(
      publicKey['userVerification'] ?? publicKey['user_verification'],
    );

    if (!rawChallenge) {
      throw new Error('Missing passkey authentication challenge.');
    }

    return {
      publicKey: {
        challenge: this.fromBase64Url(rawChallenge),
        rpId: rawRpId ?? undefined,
        timeout: this.asNumber(publicKey['timeout']),
        allowCredentials: this.mapCredentialDescriptors(rawAllowCredentials),
        userVerification: rawUserVerification as
          | UserVerificationRequirement
          | undefined,
      },
    };
  }

  private toRegistrationCreationOptions(
    publicKey: Record<string, unknown>,
  ): CredentialCreationOptions {
    const challenge = this.asString(publicKey['challenge']);
    const rp = this.asRecord(publicKey['rp']);
    const user = this.asRecord(publicKey['user']);
    const credentialParams = this.mapCredentialParameters(
      publicKey['pubKeyCredParams'] ?? publicKey['pub_key_cred_params'],
    );

    const userId = this.asString(user['id']);
    const userName = this.asString(user['name']);
    const rpName = this.asString(rp['name']);

    if (
      !challenge ||
      !userId ||
      !userName ||
      !rpName ||
      credentialParams.length === 0
    ) {
      throw new Error(
        'Missing required passkey registration options from backend.',
      );
    }

    const authenticatorSelectionSource = this.asRecord(
      publicKey['authenticatorSelection'] ??
        publicKey['authenticator_selection'],
    );

    return {
      publicKey: {
        challenge: this.fromBase64Url(challenge),
        rp: {
          id: this.asString(rp['id']),
          name: rpName,
        },
        user: {
          id: this.fromBase64Url(userId),
          name: userName,
          displayName:
            this.asString(user['displayName'] ?? user['display_name']) ??
            userName,
        },
        pubKeyCredParams: credentialParams,
        timeout: this.asNumber(publicKey['timeout']),
        excludeCredentials: this.mapCredentialDescriptors(
          publicKey['excludeCredentials'] ?? publicKey['exclude_credentials'],
        ),
        authenticatorSelection:
          Object.keys(authenticatorSelectionSource).length > 0
            ? {
                authenticatorAttachment: this.asString(
                  authenticatorSelectionSource['authenticatorAttachment'] ??
                    authenticatorSelectionSource['authenticator_attachment'],
                ) as AuthenticatorAttachment | undefined,
                residentKey: this.asString(
                  authenticatorSelectionSource['residentKey'] ??
                    authenticatorSelectionSource['resident_key'],
                ) as ResidentKeyRequirement | undefined,
                requireResidentKey:
                  this.asBoolean(
                    authenticatorSelectionSource['requireResidentKey'] ??
                      authenticatorSelectionSource['require_resident_key'],
                  ) ?? undefined,
                userVerification: this.asString(
                  authenticatorSelectionSource['userVerification'] ??
                    authenticatorSelectionSource['user_verification'],
                ) as UserVerificationRequirement | undefined,
              }
            : undefined,
        attestation: this.asString(publicKey['attestation']) as
          | AttestationConveyancePreference
          | undefined,
        extensions: this.asRecord(publicKey['extensions']),
      },
    };
  }

  private toNativeRegistrationPublicKey(
    publicKey: Record<string, unknown>,
  ): Record<string, unknown> {
    const challenge = this.asString(publicKey['challenge']);
    const rp = this.asRecord(publicKey['rp']);
    const user = this.asRecord(publicKey['user']);
    const credentialParams = this.asRecordArray(
      publicKey['pubKeyCredParams'] ?? publicKey['pub_key_cred_params'],
    )
      .map((entry) => ({
        type: this.asString(entry['type']) ?? 'public-key',
        alg: this.asNumber(entry['alg']),
      }))
      .filter((entry) => entry.alg !== undefined)
      .map((entry) => ({
        type: entry.type as 'public-key',
        alg: entry.alg as number,
      }));
    const userId = this.asString(user['id']);
    const userName = this.asString(user['name']);
    const rpName = this.asString(rp['name']);

    if (
      !challenge ||
      !userId ||
      !userName ||
      !rpName ||
      credentialParams.length === 0
    ) {
      throw new Error(
        'Missing required passkey registration options from backend.',
      );
    }

    const nativePublicKey: Record<string, unknown> = {
      challenge,
      rp: {
        id: this.asString(rp['id']) ?? undefined,
        name: rpName,
      },
      user: {
        id: userId,
        name: userName,
        displayName:
          this.asString(user['displayName'] ?? user['display_name']) ??
          undefined,
      },
      pubKeyCredParams: credentialParams,
      timeout: this.asNumber(publicKey['timeout']) ?? undefined,
      attestation: this.asString(publicKey['attestation']) ?? undefined,
      extensions: this.asRecord(publicKey['extensions']),
    };

    const excludeCredentials = this.asRecordArray(
      publicKey['excludeCredentials'] ?? publicKey['exclude_credentials'],
    )
      .map((entry) => this.resolveCredentialDescriptorId(entry))
      .filter((id): id is string => !!id)
      .map((id) => ({
        id,
        type: 'public-key' as const,
      }));

    if (excludeCredentials.length > 0) {
      nativePublicKey['excludeCredentials'] = excludeCredentials;
    }

    const authenticatorSelection = this.asRecord(
      publicKey['authenticatorSelection'] ??
        publicKey['authenticator_selection'],
    );

    if (Object.keys(authenticatorSelection).length > 0) {
      nativePublicKey['authenticatorSelection'] = {
        authenticatorAttachment:
          this.asString(
            authenticatorSelection['authenticatorAttachment'] ??
              authenticatorSelection['authenticator_attachment'],
          ) ?? undefined,
        residentKey:
          this.asString(
            authenticatorSelection['residentKey'] ??
              authenticatorSelection['resident_key'],
          ) ?? undefined,
        requireResidentKey:
          this.asBoolean(
            authenticatorSelection['requireResidentKey'] ??
              authenticatorSelection['require_resident_key'],
          ) ?? undefined,
        userVerification:
          this.asString(
            authenticatorSelection['userVerification'] ??
              authenticatorSelection['user_verification'],
          ) ?? undefined,
      };
    }

    return nativePublicKey;
  }

  private toNativeRequestPublicKey(
    publicKey: Record<string, unknown>,
  ): Record<string, unknown> {
    const challenge = this.asString(publicKey['challenge']);

    if (!challenge) {
      throw new Error('Missing passkey authentication challenge.');
    }

    const descriptors = this.mapCredentialDescriptors(
      publicKey['allowCredentials'] ?? publicKey['allow_credentials'],
    );

    const nativePublicKey: Record<string, unknown> = {
      challenge,
      rpId: this.asString(publicKey['rpId'] ?? publicKey['rp_id']) ?? undefined,
      timeout: this.asNumber(publicKey['timeout']) ?? undefined,
      userVerification:
        this.asString(
          publicKey['userVerification'] ?? publicKey['user_verification'],
        ) ?? undefined,
      extensions: this.asRecord(publicKey['extensions']),
    };

    if (descriptors && descriptors.length > 0) {
      nativePublicKey['allowCredentials'] = descriptors.map((entry) => ({
        id: this.toBase64Url(entry.id),
        type: entry.type,
        transports: entry.transports,
      }));
    }

    return nativePublicKey;
  }

  private mapCredentialDescriptors(
    rawDescriptors: unknown,
  ): PublicKeyCredentialDescriptor[] | undefined {
    if (!Array.isArray(rawDescriptors) || rawDescriptors.length === 0) {
      return undefined;
    }

    return rawDescriptors
      .map((entry) => this.asRecord(entry))
      .map((entry) => {
        const id = this.resolveCredentialDescriptorId(entry);

        if (!id) {
          return null;
        }

        return {
          id: this.fromBase64Url(id),
          type: this.asString(entry['type']) ?? 'public-key',
          transports: Array.isArray(entry['transports'])
            ? (entry['transports'] as AuthenticatorTransport[])
            : undefined,
        } as PublicKeyCredentialDescriptor;
      })
      .filter((entry): entry is PublicKeyCredentialDescriptor => !!entry);
  }

  private mapCredentialParameters(
    rawParams: unknown,
  ): PublicKeyCredentialParameters[] {
    if (!Array.isArray(rawParams) || rawParams.length === 0) {
      return [];
    }

    return rawParams
      .map((entry) => this.asRecord(entry))
      .map((entry) => ({
        type: (this.asString(entry['type']) ??
          'public-key') as PublicKeyCredentialType,
        alg: this.asNumber(entry['alg']),
      }))
      .filter((entry) => entry.alg !== undefined)
      .map((entry) => ({
        type: entry.type,
        alg: entry.alg as number,
      }));
  }

  private normalizeNativeRegistrationCredential(
    raw: unknown,
  ): WebauthnRegistrationCredential {
    const root = this.asRecord(raw);
    const nestedCredential = this.asRecord(root['credential']);
    const response = this.asRecord(root['response']);
    const nestedResponse = this.asRecord(nestedCredential['response']);

    const id =
      this.asString(root['id']) ??
      this.asString(root['credentialId']) ??
      this.asString(nestedCredential['id']) ??
      this.asString(nestedCredential['credentialId']) ??
      this.asString(root['rawId']) ??
      this.asString(root['raw_id']) ??
      this.asString(nestedCredential['rawId']) ??
      this.asString(nestedCredential['raw_id']);

    if (!id) {
      throw new Error(
        'Passkey registration returned an invalid credential payload (missing id).',
      );
    }

    const transportsSource =
      response['transports'] ?? nestedResponse['transports'];

    return {
      id,
      rawId:
        this.asString(root['rawId']) ??
        this.asString(root['raw_id']) ??
        this.asString(nestedCredential['rawId']) ??
        this.asString(nestedCredential['raw_id']),
      response: {
        clientDataJSON:
          this.asString(response['clientDataJSON']) ??
          this.asString(response['client_data_json']) ??
          this.asString(nestedResponse['clientDataJSON']) ??
          this.asString(nestedResponse['client_data_json']),
        attestationObject:
          this.asString(response['attestationObject']) ??
          this.asString(response['attestation_object']) ??
          this.asString(nestedResponse['attestationObject']) ??
          this.asString(nestedResponse['attestation_object']),
        transports: Array.isArray(transportsSource)
          ? transportsSource
              .map((item) => this.asString(item))
              .filter((item): item is string => !!item)
          : undefined,
        publicKey:
          this.asString(response['publicKey']) ??
          this.asString(response['public_key']) ??
          this.asString(nestedResponse['publicKey']) ??
          this.asString(nestedResponse['public_key']),
        publicKeyAlgorithm:
          this.asNumber(response['publicKeyAlgorithm']) ??
          this.asNumber(response['public_key_algorithm']) ??
          this.asNumber(nestedResponse['publicKeyAlgorithm']) ??
          this.asNumber(nestedResponse['public_key_algorithm']),
        authenticatorData:
          this.asString(response['authenticatorData']) ??
          this.asString(response['authenticator_data']) ??
          this.asString(nestedResponse['authenticatorData']) ??
          this.asString(nestedResponse['authenticator_data']),
      },
      type:
        this.asString(root['type']) ??
        this.asString(nestedCredential['type']) ??
        'public-key',
    };
  }

  private resolveCredentialDescriptorId(
    entry: Record<string, unknown>,
  ): string | undefined {
    const directId = this.asString(entry['id']);

    if (directId) {
      return directId;
    }

    const directRawId = this.asString(entry['rawId'] ?? entry['raw_id']);

    if (directRawId) {
      return directRawId;
    }

    const nestedIdRecord = this.asRecord(entry['id']);
    const nestedId = this.asString(
      nestedIdRecord['id'] ??
        nestedIdRecord['rawId'] ??
        nestedIdRecord['raw_id'],
    );

    if (nestedId) {
      return nestedId;
    }

    const credentialRecord = this.asRecord(entry['credential']);
    return this.asString(
      credentialRecord['id'] ??
        credentialRecord['rawId'] ??
        credentialRecord['raw_id'],
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private toBase64Url(buffer: BufferSource): string {
    const bytes =
      buffer instanceof ArrayBuffer
        ? new Uint8Array(buffer)
        : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let binary = '';

    for (const value of bytes) {
      binary += String.fromCharCode(value);
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private fromBase64Url(value: string): ArrayBuffer {
    if (!value) {
      throw new Error('Invalid base64url value for WebAuthn field.');
    }

    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return bytes.buffer;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private asRecordArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => this.asRecord(entry));
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
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

  private isNativePlatform(): boolean {
    return Capacitor.getPlatform() !== 'web';
  }
}
