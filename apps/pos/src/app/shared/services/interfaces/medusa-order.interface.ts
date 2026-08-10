export interface MedusaOrder {
  id: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  display_id: number;
  cart_id?: string;
  customer_id: string;
  customer?: any;
  email: string;
  billing_address_id?: string;
  billing_address?: any;
  shipping_address_id?: string;
  shipping_address?: any;
  region_id: string;
  region?: any;
  currency_code: string;
  tax_rate?: number;
  discounts?: any[];
  gift_cards?: any[];
  shipping_methods?: any[];
  payments?: any[];
  fulfillments?: any[];
  returns?: any[];
  claims?: any[];
  refunds?: any[];
  swaps?: any[];
  draft_order_id?: string;
  draft_order?: any;
  items: any[];
  edits?: any[];
  gift_card_transactions?: any[];
  canceled_at?: string;
  no_notification?: boolean;
  idempotency_key?: string;
  external_id?: string;
  sales_channel_id?: string;
  sales_channel?: any;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  refunded_total: number;
  total: number;
  subtotal: number;
  paid_total: number;
  refundable_amount: number;
  gift_card_total: number;
  gift_card_tax_total: number;
  returnable_items?: any[];
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface MedusaOrderResponse {
  order: MedusaOrder;
}

export interface MedusaOrdersListResponse {
  orders: MedusaOrder[];
  count: number;
  offset: number;
  limit: number;
}
