export type DebugEventKind = 'application' | 'network' | string;
export type DebugEventLevel = 'debug' | 'info' | 'warn' | 'error' | string;

export interface DebugEvent {
  source: string;
  message: string;
  kind: DebugEventKind;
  level: DebugEventLevel;
  context?: Record<string, unknown>;
  timestamp: string;
}

export namespace DebugActions {
  export class LogEvent {
    static readonly type = '[Debug] Log Event';
    constructor(public payload: DebugEvent) {}
  }
}
