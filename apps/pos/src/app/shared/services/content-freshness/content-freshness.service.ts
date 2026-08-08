import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { of, timer } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { LoadCatalogData } from '../../../store/catalog/catalog.actions';
import { CatalogStateModel } from '../../../store/catalog/catalog.state';
import { LoadCmsPages } from '../../../store/cms/cms.actions';
import { CmsStateModel } from '../../../store/cms/cms.state';
import { LoadHomeData } from '../../../store/home/home.actions';
import { HomeStateModel } from '../../../store/home/home.state';
import { DebugEventsService } from '../debug-events/debug-events.service';

type FreshnessPayload = {
  home?: string;
  catalog?: string;
  cms?: string;
};

type FreshnessResponse = {
  homeVersion?: unknown;
  catalogVersion?: unknown;
  cmsVersion?: unknown;
  home?: unknown;
  catalog?: unknown;
  cms?: unknown;
  data?: unknown;
  versions?: unknown;
};

@Injectable({ providedIn: 'root' })
export class ContentFreshnessService {
  private static readonly DEFAULT_POLL_MS = 60 * 1000;
  private static readonly DEFAULT_ENDPOINT = '/api/storefront/versions';

  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);
  private readonly debugEvents = inject(DebugEventsService);

  private readonly enabled = environment.bagisto.freshness?.enabled !== false;
  private readonly pollMs =
    environment.bagisto.freshness?.pollMs ??
    ContentFreshnessService.DEFAULT_POLL_MS;
  private readonly endpoint =
    environment.bagisto.freshness?.endpoint ??
    ContentFreshnessService.DEFAULT_ENDPOINT;

  private started = false;
  private disabledBecauseEndpointMissing = false;
  private lastSeen: FreshnessPayload | null = null;

  start(): void {
    if (!this.enabled || this.started) {
      return;
    }

    this.started = true;

    timer(0, this.pollMs)
      .pipe(
        exhaustMap(() => {
          if (!this.shouldPollNow()) {
            return of(null);
          }

          return this.http.get<FreshnessResponse>(this.endpoint).pipe(
            catchError((error: unknown) => {
              const status = this.extractStatusCode(error);

              if (status === 404) {
                this.disabledBecauseEndpointMissing = true;
                this.debugEvents.log(
                  'ContentFreshnessService',
                  'freshness:disabled-missing-endpoint',
                  {
                    kind: 'application',
                    level: 'warn',
                    echoToConsole: true,
                    context: {
                      endpoint: this.endpoint,
                    },
                  },
                );

                return of(null);
              }

              this.debugEvents.log(
                'ContentFreshnessService',
                'freshness:poll:error',
                {
                  kind: 'network',
                  level: 'debug',
                  echoToConsole: false,
                  context: {
                    endpoint: this.endpoint,
                    message: this.extractMessage(error),
                  },
                },
              );

              return of(null);
            }),
          );
        }),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        const next = this.normalizePayload(response);

        if (!next) {
          return;
        }

        if (!this.lastSeen) {
          this.lastSeen = next;
          this.debugEvents.log(
            'ContentFreshnessService',
            'freshness:baseline',
            {
              kind: 'application',
              level: 'debug',
              echoToConsole: false,
              context: next,
            },
          );

          return;
        }

        const changedDomains = this.diffDomains(this.lastSeen, next);

        if (changedDomains.length === 0) {
          return;
        }

        this.lastSeen = next;
        this.invalidateChangedDomains(changedDomains);
      });
  }

  private shouldPollNow(): boolean {
    if (this.disabledBecauseEndpointMissing) {
      return false;
    }

    if (
      typeof document !== 'undefined' &&
      document.visibilityState !== 'visible'
    ) {
      return false;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }

    return true;
  }

  private normalizePayload(
    response: FreshnessResponse,
  ): FreshnessPayload | null {
    const container = this.asRecord(
      response.versions ?? response.data ?? response,
    );

    const home =
      this.asVersionString(container['homeVersion']) ??
      this.asVersionString(container['home']);
    const catalog =
      this.asVersionString(container['catalogVersion']) ??
      this.asVersionString(container['catalog']);
    const cms =
      this.asVersionString(container['cmsVersion']) ??
      this.asVersionString(container['cms']);

    if (!home && !catalog && !cms) {
      return null;
    }

    return {
      home,
      catalog,
      cms,
    };
  }

  private diffDomains(
    previous: FreshnessPayload,
    next: FreshnessPayload,
  ): Array<'home' | 'catalog' | 'cms'> {
    const changed: Array<'home' | 'catalog' | 'cms'> = [];

    if (this.hasChanged(previous.home, next.home)) {
      changed.push('home');
    }

    if (this.hasChanged(previous.catalog, next.catalog)) {
      changed.push('catalog');
    }

    if (this.hasChanged(previous.cms, next.cms)) {
      changed.push('cms');
    }

    return changed;
  }

  private hasChanged(
    prev: string | undefined,
    next: string | undefined,
  ): boolean {
    return (
      typeof prev === 'string' && typeof next === 'string' && prev !== next
    );
  }

  private invalidateChangedDomains(
    domains: Array<'home' | 'catalog' | 'cms'>,
  ): void {
    this.debugEvents.log('ContentFreshnessService', 'freshness:changed', {
      kind: 'application',
      level: 'debug',
      echoToConsole: true,
      context: {
        domains,
      },
    });

    if (domains.includes('home')) {
      const homeState = this.store.selectSnapshot(
        (rootState: { home: HomeStateModel }) => rootState.home,
      );

      if (homeState?.loaded || homeState?.featuredProducts.length) {
        const payload =
          this.parseRequestPayload<HomeStateModel['lastRequestKey']>(
            homeState?.lastRequestKey ?? null,
          ) ?? {};

        this.store.dispatch(new LoadHomeData({ ...payload, force: true }));
      }
    }

    if (domains.includes('catalog')) {
      const catalogState = this.store.selectSnapshot(
        (rootState: { catalog: CatalogStateModel }) => rootState.catalog,
      );

      if (catalogState?.loaded || catalogState?.products.length) {
        const payload =
          this.parseRequestPayload<CatalogStateModel['lastRequestKey']>(
            catalogState?.lastRequestKey ?? null,
          ) ?? {};

        this.store.dispatch(new LoadCatalogData({ ...payload, force: true }));
      }
    }

    if (domains.includes('cms')) {
      const cmsState = this.store.selectSnapshot(
        (rootState: { cms: CmsStateModel }) => rootState.cms,
      );

      if (cmsState?.loaded || cmsState?.pages.length) {
        this.store.dispatch(new LoadCmsPages({ force: true }));
      }
    }
  }

  private parseRequestPayload<T extends string | null>(
    rawRequestKey: T,
  ): Record<string, unknown> | null {
    if (!rawRequestKey || typeof rawRequestKey !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(rawRequestKey);

      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private asVersionString(value: unknown): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : undefined;
    }

    return undefined;
  }

  private extractMessage(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const message = (error as { message?: unknown }).message;

    return typeof message === 'string' ? message : undefined;
  }

  private extractStatusCode(error: unknown): number | undefined {
    if (error instanceof HttpErrorResponse) {
      return Number.isFinite(error.status) ? error.status : undefined;
    }

    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const status = (error as { status?: unknown }).status;

    return typeof status === 'number' && Number.isFinite(status)
      ? status
      : undefined;
  }
}
