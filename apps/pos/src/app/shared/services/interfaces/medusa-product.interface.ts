// Product Image interface matching API response
export interface MedusaProductImage {
  id: string;
  url: string;
  metadata?: any | null;
  rank?: number;
  product_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Product Category interface matching API response
export interface MedusaProductCategory {
  id?: string;
  name?: string;
  handle?: string;
  is_internal?: boolean;
  [key: string]: any; // Allow additional properties
}

// Product Option interface
export interface MedusaProductOption {
  id: string;
  title: string;
  product_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  metadata?: any | null;
  values?: MedusaProductOptionValue[] | null;
}

// Product Option Value interface
export interface MedusaProductOptionValue {
  id: string;
  value: string;
  option_id: string;
  variant_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  metadata?: any | null;
}

// Product Variant with calculated price
export interface MedusaProductVariant {
  id: string;
  title: string;
  product_id: string;
  sku?: string | null;
  barcode?: string | null;
  ean?: string | null;
  upc?: string | null;
  variant_rank: number;
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  hs_code?: string | null;
  origin_country?: string | null;
  mid_code?: string | null;
  material?: string | null;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  metadata?: any | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  calculated_price?: MedusaCalculatedPrice | null;
  options?: any[] | null;
  prices?: any[] | null;
}

// Calculated Price interface
export interface MedusaCalculatedPrice {
  id: string;
  is_calculated_price_price_list: boolean;
  is_calculated_price_tax_inclusive: boolean;
  calculated_amount: number;
  raw_calculated_amount: {
    value: string;
    precision: number;
  };
  is_original_price_price_list: boolean;
  is_original_price_tax_inclusive: boolean;
  original_amount: number;
  raw_original_amount: {
    value: string;
    precision: number;
  };
  currency_code: string;
  calculated_price?: {
    id: string;
    price_list_id?: string | null;
    price_list_type?: string | null;
    min_quantity?: number | null;
    max_quantity?: number | null;
  };
  original_price?: {
    id: string;
    price_list_id?: string | null;
    price_list_type?: string | null;
    min_quantity?: number | null;
    max_quantity?: number | null;
  };
}

export interface MedusaProduct {
  id: string;
  title?: string;
  subtitle?: string | null;
  description?: string;
  handle?: string;
  is_giftcard?: boolean;
  discountable?: boolean;
  thumbnail?: string;
  collection_id?: string | null;
  type_id?: string | null;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  hs_code?: string | null;
  origin_country?: string | null;
  mid_code?: string | null;
  material?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  metadata?: any;
  // Arrays can contain null values based on API response
  variants?: (MedusaProductVariant | null)[];
  type?: any;
  collection?: any;
  options?: (MedusaProductOption | null)[];
  tags?: any[];
  images?: (MedusaProductImage | null)[];
  categories?: (MedusaProductCategory | null)[];
  // Legacy properties for backward compatibility
  status?: string;
  external_id?: string | null;
  profile_id?: string;
  profiles?: any[];
  sales_channels?: any[];
  variant_rank?: number;
  inventory_quantity?: number;
  allow_backorder?: boolean;
  manage_inventory?: boolean;
}





export interface MedusaProductsResponse {
  products: MedusaProduct[];
  count: number;
  offset: number;
  limit: number;
}

// Product-related entities
export interface ImagesEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  url: string;
  metadata?: null;
}

export interface OptionsEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  title: string;
  product_id: string;
  metadata?: null;
  values?: (ValuesEntityOrOptionsEntity)[] | null;
}

export interface ValuesEntityOrOptionsEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  value: string;
  option_id: string;
  variant_id: string;
  metadata?: null;
}

export interface ProfilesEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  name: string;
  type: string;
  metadata?: null;
}

export interface VariantsEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  title: string;
  product_id: string;
  sku?: null;
  barcode?: null;
  ean?: null;
  upc?: null;
  variant_rank: number;
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  hs_code?: null;
  origin_country?: null;
  mid_code?: null;
  material?: null;
  weight?: null;
  length?: null;
  height?: null;
  width?: null;
  metadata?: null;
  options?: (ValuesEntityOrOptionsEntity)[] | null;
  prices?: (PricesEntity)[] | null;
  original_price?: null;
  calculated_price?: null;
  original_price_incl_tax?: null;
  calculated_price_incl_tax?: null;
  original_tax?: null;
  calculated_tax?: null;
  tax_rates?: null;
}

export interface PricesEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: null;
  currency_code: string;
  amount: number;
  min_quantity?: null;
  max_quantity?: null;
  price_list_id?: null;
  region_id?: null;
  price_list?: null;
  variant_id: string;
}
