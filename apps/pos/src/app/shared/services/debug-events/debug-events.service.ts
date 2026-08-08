import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';

import { environment } from '../../../../environments/environment';
import {
  DebugActions,
  DebugEvent,
  DebugEventKind,
  DebugEventLevel,
} from '../../../store/debug/debug.actions';

type DebugLogOptions = {
  kind?: DebugEventKind;
  level?: DebugEventLevel;
  context?: Record<string, unknown>;
  echoToConsole?: boolean;
};

const DEFAULT_DEBUG_CONFIG = {
  enabled: !environment.production,
  maxSize: environment.production ? 50 : 200,
  echoToConsole: !environment.production,
  networkTracing: !environment.production,
};

@Injectable({ providedIn: 'root' })
export class DebugEventsService {
  private readonly store = inject(Store);

  private readonly config = environment.debugLogging || DEFAULT_DEBUG_CONFIG;

  log(source: string, message: string, options?: DebugLogOptions): void {
    if (!this.config.enabled) {
      return;
    }

    const event: DebugEvent = {
      source,
      message,
      kind: options?.kind ?? 'application',
      level: options?.level ?? 'debug',
      context: options?.context,
      timestamp: new Date().toISOString(),
    };

    this.store.dispatch(new DebugActions.LogEvent(event));

    if (options?.echoToConsole ?? this.config.echoToConsole) {
      this.echo(event);
    }
  }

  logNetwork(
    source: string,
    message: string,
    context?: Record<string, unknown>,
    level: DebugEventLevel = 'debug',
  ): void {
    if (this.config.networkTracing === false) {
      return;
    }

    this.log(source, message, {
      kind: 'network',
      level,
      context,
    });
  }

  private echo(event: DebugEvent): void {
    const prefix = `[${event.source}] ${event.message}`;

    if (event.level === 'error') {
      console.error(prefix, event.context ?? {});
      return;
    }

    if (event.level === 'warn') {
      console.warn(prefix, event.context ?? {});
      return;
    }

    console.log(prefix, event.context ?? {});
  }
}
