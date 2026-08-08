import { Injectable } from '@angular/core';

export type OrderStatusTone =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'default';

export interface OrderStatusPresentation {
  label: string;
  tone: OrderStatusTone;
  icon: string;
  ariaLabel: string;
}

@Injectable({ providedIn: 'root' })
export class OrderStatusPresentationService {
  getPresentation(status: string | null | undefined): OrderStatusPresentation {
    const normalized = this.normalizeStatus(status);

    if (!normalized) {
      return this.buildPresentation(
        'Unknown',
        'default',
        'help-circle-outline',
      );
    }

    if (
      normalized.includes('cancel') ||
      normalized.includes('fraud') ||
      normalized.includes('close')
    ) {
      return this.buildPresentation(
        'Canceled',
        'danger',
        'close-circle-outline',
      );
    }

    if (normalized.includes('complete')) {
      return this.buildPresentation(
        'Completed',
        'success',
        'checkmark-circle-outline',
      );
    }

    if (
      normalized.includes('ship') ||
      normalized.includes('process') ||
      normalized.includes('pack')
    ) {
      return this.buildPresentation('Processing', 'info', 'cube-outline');
    }

    if (normalized.includes('hold')) {
      return this.buildPresentation(
        'On Hold',
        'warning',
        'pause-circle-outline',
      );
    }

    if (normalized.includes('pending') || normalized.includes('payment')) {
      return this.buildPresentation(
        'Awaiting Payment',
        'warning',
        'time-outline',
      );
    }

    return this.buildPresentation(
      this.titleize(normalized),
      'default',
      'help-circle-outline',
    );
  }

  private buildPresentation(
    label: string,
    tone: OrderStatusTone,
    icon: string,
  ): OrderStatusPresentation {
    return {
      label,
      tone,
      icon,
      ariaLabel: `Order status: ${label}`,
    };
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').trim().toLowerCase();
  }

  private titleize(value: string): string {
    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }
}
