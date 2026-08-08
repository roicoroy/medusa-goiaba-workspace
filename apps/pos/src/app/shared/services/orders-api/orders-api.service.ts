import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';

import { BagistoApiConfigService } from '../../api/api-base-url';
import {
  CustomerOrdersResponse,
  OrderDeliveryOption,
  OrderItemSummary,
  OrderShipment,
  OrderSummary,
} from '@org/storefront-models';
import { DebugEventsService } from '../debug-events/debug-events.service';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);

  private readonly apiConfig = inject(BagistoApiConfigService);
  private readonly debugEvents = inject(DebugEventsService);

  private get apiBase(): string {
    return this.apiConfig.apiBase;
  }

  getCustomerOrders(): Observable<CustomerOrdersResponse> {
    return this.http.get<unknown>(`${this.apiBase}/customer/orders`).pipe(
      map((response) => {
        const root = this.asRecord(response);
        const orders = this.asArray(root['data']).map((entry) =>
          this.toOrderSummary(this.asRecord(entry)),
        );

        this.debugEvents.logNetwork(
          'OrdersApiService',
          'customer-orders:loaded',
          {
            apiBase: this.apiBase,
            totalOrders: orders.length,
            deliveryStatuses: orders
              .filter(
                (order) =>
                  order.shipment?.currentStatus ||
                  order.shipment?.deliveryStatusLabel,
              )
              .map((order) => ({
                id: order.id,
                incrementId: order.incrementId,
                deliveryStatus: order.shipment?.currentStatus,
                deliveryStatusLabel: order.shipment?.deliveryStatusLabel,
                updatedAt: order.shipment?.updatedAt,
              })),
          },
        );

        return {
          success: true,
          message: this.toString(root['message']),
          orders,
        };
      }),
      catchError(
        this.handleError<CustomerOrdersResponse>('getCustomerOrders', {
          success: false,
          message: 'Failed to fetch orders',
          orders: [],
        }),
      ),
    );
  }

  getOrderById(orderId: string): Observable<OrderSummary | null> {
    return this.http
      .get<unknown>(`${this.apiBase}/customer/orders/${orderId}`)
      .pipe(
        map((response) => {
          const root = this.asRecord(response);
          const data = this.asRecord(root['data']);
          return this.toOrderSummary(data);
        }),
        catchError(() => of(null)),
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

      this.debugEvents.log('OrdersApiService', `${operation}:failed`, {
        kind: 'network',
        level: 'error',
        context: { error: error as Record<string, unknown> },
      });
      return of(result as T);
    };
  }

  private toOrderSummary(raw: Record<string, unknown>): OrderSummary {
    return {
      id: this.toString(raw['id']) ?? '',
      incrementId: this.toString(raw['increment_id']) ?? '',
      status: this.toString(raw['status']) ?? '',
      grandTotal: this.toNumber(raw['grand_total']),
      formattedGrandTotal: this.toString(raw['formatted_grand_total']),
      createdAt: this.toString(raw['created_at']),
      shippingMethod: this.toString(raw['shipping_method']),
      deliveryOption: this.toDeliveryOption(raw['delivery_option']),
      shipment: this.toShipment(raw['shipment']),
      itemsCount: this.toNumber(raw['items_count']) ?? 0,
      items: this.asArray(raw['items']).map((entry) =>
        this.toOrderItemSummary(this.asRecord(entry)),
      ),
    };
  }

  private toDeliveryOption(raw: unknown): OrderDeliveryOption | undefined {
    const value = this.asRecord(raw);

    const option: OrderDeliveryOption = {
      type: this.toString(value['type']),
      slotCode: this.toString(value['slot_code']),
      slotLabel: this.toString(value['slot_label']),
      slotWindow: this.toString(value['slot_window']),
      expectedDeliveryDate: this.toString(value['expected_delivery_date']),
      surcharge: this.toNumber(value['surcharge']),
    };

    const hasData = Object.values(option).some(
      (entry) => entry !== undefined && entry !== null && entry !== '',
    );

    return hasData ? option : undefined;
  }

  private toShipment(raw: unknown): OrderShipment | null {
    const value = this.asRecord(raw);

    const shipment: OrderShipment = {
      id: this.toString(value['id']),
      currentStatus: this.toString(value['current_status']),
      deliveryStatusLabel: this.toString(value['delivery_status_label']),
      expectedDeliveryDate: this.toString(value['expected_delivery_date']),
      assignedAt: this.toString(value['assigned_at']),
      pickedUpAt: this.toString(value['picked_up_at']),
      deliveredAt: this.toString(value['delivered_at']),
      driverName: this.toString(value['driver_name']),
      updatedAt: this.toString(value['updated_at']),
    };

    const hasData = Object.values(shipment).some(
      (entry) => entry !== undefined && entry !== null && entry !== '',
    );

    return hasData ? shipment : null;
  }

  private toOrderItemSummary(raw: Record<string, unknown>): OrderItemSummary {
    return {
      id: this.toString(raw['id']) ?? '',
      name: this.toString(raw['name']) ?? 'Item',
      sku: this.toString(raw['sku']),
      quantityOrdered: this.toNumber(raw['qty_ordered']) ?? 0,
      formattedPrice: this.toString(raw['formatted_price']),
      formattedTotal: this.toString(raw['formatted_total']),
      imageUrl: this.toString(raw['base_image']),
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
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }
}
