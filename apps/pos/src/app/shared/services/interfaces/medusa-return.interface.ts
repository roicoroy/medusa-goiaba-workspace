export type ReturnStatus = 'requested' | 'received' | 'requires_action' | 'canceled';

export interface OrderReturnItem {
  id: string;
  return_id: string;
  item_id: string;
  item?: any; // Order line item
  quantity: number;
  received_quantity?: number;
  requested_quantity?: number;
  reason_id?: string;
  reason?: any;
  note?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface MedusaReturn {
  id: string;
  display_id?: number;  // Return display ID (e.g., 4)
  order_version?: number;
  status: ReturnStatus;
  order_id: string;
  order?: any;
  items: OrderReturnItem[];
  shipping_method?: any;
  shipping_methods?: any[];  // Add both for compatibility
  shipping_data?: any;
  refund_amount?: number;
  received_at?: string;
  requested_at?: string;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  no_notification?: boolean;
  idempotency_key?: string;
  location_id?: string;
}

export interface ReturnReason {
  id: string;
  value: string;
  label: string;
  description?: string;
  parent_return_reason_id?: string;
  parent_return_reason?: ReturnReason;
  return_reason_children?: ReturnReason[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  metadata?: any;
}

export interface CreateReturnRequest {
  order_id: string;
  items: {
    id: string;
    quantity: number;
    reason_id?: string;
    note?: string;
  }[];
  return_shipping?: {
    option_id: string;
    price?: number;
  };
  note?: string;
  receive_now?: boolean;
  no_notification?: boolean;
  refund?: number;
}

export interface ReturnResponse {
  return: MedusaReturn;
}

export interface ReturnsListResponse {
  returns: MedusaReturn[];
  count: number;
  offset: number;
  limit: number;
}
