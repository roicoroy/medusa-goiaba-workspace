import { Injectable } from '@angular/core';

export type DeliveryStatusTone =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'default';

export interface DeliveryStatusPresentation {
  label: string;
  tone: DeliveryStatusTone;
  ariaLabel: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryStatusPresentationService {
  getPresentation(
    status: string | null | undefined,
    fallbackLabel?: string | null,
  ): DeliveryStatusPresentation {
    const normalized = this.normalizeStatus(status);

    if (!normalized) {
      return this.buildPresentation(
        fallbackLabel || 'Pending Assignment',
        'default',
      );
    }

    const toneMap: Record<string, DeliveryStatusTone> = {
      unassigned: 'default',
      assigned: 'info',
      accepted: 'info',
      picked_up: 'warning',
      in_transit: 'warning',
      delivered: 'success',
      failed: 'danger',
      cancelled: 'danger',
    };

    const tone =
      toneMap[normalized] ??
      (normalized.includes('fail') || normalized.includes('cancel')
        ? 'danger'
        : 'default');

    return this.buildPresentation(
      fallbackLabel || this.titleize(normalized),
      tone,
    );
  }

  badgeClass(status: string | null | undefined): string {
    const tone = this.getPresentation(status).tone;

    return `status-pill status-${tone}`;
  }

  private buildPresentation(
    label: string,
    tone: DeliveryStatusTone,
  ): DeliveryStatusPresentation {
    return {
      label,
      tone,
      ariaLabel: `Delivery status: ${label}`,
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
