import { Injectable, OnDestroy, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { environment } from 'src/environments/environment';
import { ErrorActions } from 'src/app/store/errors/errors.actions';
import { DebugEventsService } from '../services/debug-events/debug-events.service';

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const DEV_RETENTION_HOURS = 72;
const PROD_RETENTION_HOURS = 24;

@Injectable({ providedIn: 'root' })
export class ErrorRetentionService implements OnDestroy {
  private readonly store = inject(Store);
  private readonly debugEvents = inject(DebugEventsService);

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.runCleanup();

    this.cleanupTimer = setInterval(() => {
      this.runCleanup();
    }, CLEANUP_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (!this.cleanupTimer) {
      return;
    }

    clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
  }

  private runCleanup(): void {
    const retentionHours = environment.production
      ? PROD_RETENTION_HOURS
      : DEV_RETENTION_HOURS;
    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    this.store.dispatch(new ErrorActions.ClearOldErrors(cutoff));
    this.debugEvents.log('ErrorRetentionService', 'errors:cleanup', {
      kind: 'lifecycle',
      level: 'debug',
      context: {
        retentionHours,
        cutoffIso: cutoff.toISOString(),
      },
    });
  }
}
