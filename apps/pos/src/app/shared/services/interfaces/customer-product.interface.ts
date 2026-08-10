import { MedusaAddress } from "./medusa-address.interface";

// Note: MedusaProduct is now defined in medusa-product.interface.ts to avoid conflicts
// Product-related entities moved to medusa-product.interface.ts

export interface MetaDatum {
  id: number;
  key: string;
  value: string;
}

export interface LineItem {
  id?: number;
  name?: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  tax_class?: string;
  subtotal?: string;
  subtotal_tax?: string;
  total?: string;
  total_tax?: string;
  taxes?: any[];
  meta_data?: any[];
  sku?: string;
  price?: string;
  image?: string;
}

export interface ShippingLine {
  id?: number;
  method_title?: string;
  method_id?: string;
  instance_id?: string;
  total?: string;
  total_tax?: string;
  taxes?: any[];
  meta_data?: any[];
}

export interface Cart {
  // built from my own object sending in, disregard if necessary!
  payment_method: string;
  payment_method_title: string;
  billing: Billing;
  shipping: Shipping;
  line_items: Array<LineItem>;
  shipping_lines: Array<ShippingLine>;
  customer_id: number;
  meta_data: Array<[]>;
  set_paid: false;
}

export interface Image {
  id: number;
  date_created: Date;
  date_created_gmt: Date;
  date_modified: Date;
  date_modified_gmt: Date;
  src: string;
  name: string;
  alt: string;
  position: number;
}

export interface MedusaCustomer {
  customer: any;
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  email: string;
  first_name: string;
  last_name: string;
  billing_address_id?: null;
  phone?: null;
  has_account: boolean;
  metadata?: null;
  company_name?: string;
  orders: (OrdersEntity)[];
  shipping_addresses?: (MedusaAddress)[];
  addresses?: (MedusaAddress)[];
}
export interface OrdersEntity {
  object: string;
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  display_id: number;
  cart_id: string;
  customer_id: string;
  email: string;
  billing_address_id: string;
  shipping_address_id: string;
  region_id: string;
  currency_code: string;
  tax_rate?: null;
  draft_order_id?: null;
  canceled_at?: null;
  metadata: Metadata;
  no_notification?: null;
  idempotency_key?: null;
  external_id?: null;
  sales_channel_id: string;
  items?: (ItemsEntity)[] | null;
  // Financials
  total: number;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  refunded_total: number;
}
export interface Metadata {
}
export interface ItemsEntity {
  id: string;
  created_at: string;
  updated_at: string;
  cart_id: string;
  order_id: string;
  swap_id?: null;
  claim_order_id?: null;
  original_item_id?: null;
  order_edit_id?: null;
  title: string;
  description: string;
  thumbnail: string;
  is_return: boolean;
  is_giftcard: boolean;
  should_merge: boolean;
  allow_discounts: boolean;
  has_shipping: boolean;
  unit_price: number;
  variant_id: string;
  quantity: number;
  fulfilled_quantity?: null;
  returned_quantity?: null;
  shipped_quantity?: null;
  metadata: Metadata;
}
export interface ShippingAddressesEntity {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: null;
  customer_id?: string;
  company?: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string | null;
  city: string;
  country_code: string;
  province?: string | null;
  postal_code?: string;
  phone?: string;
  metadata?: Metadata1 | null;
}
export interface Metadata1 {
}
export interface Billing {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: any;
  customer_id: string;
  company: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: any;
  city: string;
  country_code: string;
  province?: null;
  postal_code: string;
  phone: string;
  metadata?: any;
}

export interface Shipping {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: any;
  customer_id: string;
  company: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: any;
  city: string;
  country_code: string;
  province?: null;
  postal_code: string;
  phone: string;
  metadata?: any;
}


