import { MedusaLineItem } from './medusa-line-items.interface';

export interface MedusaCart {
  id: string;
  email?: string;
  billing_address_id?: string;
  billing_address?: any;
  shipping_address_id?: string;
  shipping_address?: any;
  items?: MedusaLineItem[];
  region_id?: string;
  region?: any;
  currency_code?: string;
  customer_id?: string;
  payment_session?: any;
  payment_sessions?: any[];
  payment_id?: string;
  shipping_methods?: any[];
  shipping_total?: number;
  discount_total?: number;
  item_tax_total?: number;
  shipping_tax_total?: number;
  tax_total?: number;
  refunded_total?: number;
  total?: number;
  subtotal?: number;
  refundable_amount?: number;
  gift_card_total?: number;
  gift_card_tax_total?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  metadata?: any;
  sales_channel_id?: string;
  sales_channel?: any;
  discounts?: any[];
  gift_cards?: any[];
  customer?: any;
  payment?: any;
  completed_at?: string;
  payment_authorized_at?: string;
  idempotency_key?: string;
  context?: any;
}

export interface MedusaCartResponse {
  cart: MedusaCart;
}

export interface DeleteProdRespoonse {
  id: string;
  object: string;
  deleted: boolean;
}
