export interface Wishlist {
  id: string;
  customer_id: string;
  sales_channel_id: string;
  items: WishlistItem[];
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  product_variant_id: string;
  wishlist_id: string;
  product_variant?: ProductVariantWithProduct;
  product?: any; // MedusaProduct reference (legacy)
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProductVariantWithProduct extends ProductVariant {
  product?: {
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string;
    handle: string;
    thumbnail: string;
    is_giftcard: boolean;
    discountable: boolean;
    collection_id?: string | null;
    type_id?: string | null;
    weight: string;
    length?: string | null;
    height?: string | null;
    width?: string | null;
    hs_code?: string | null;
    origin_country?: string | null;
    mid_code?: string | null;
    material?: string | null;
    created_at: string;
    updated_at: string;
    images: ProductImage[];
  };
}

export interface ProductImage {
  id: string;
  url: string;
  metadata?: any;
  rank: number;
  product_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  product_id: string;
  sku?: string;
  barcode?: string;
  ean?: string;
  upc?: string;
  variant_rank: number;
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  hs_code?: string;
  origin_country?: string;
  mid_code?: string;
  material?: string;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
  metadata?: any;
  options?: any[];
  prices?: any[];
  original_price?: number;
  calculated_price?: number | any;
  original_price_incl_tax?: number;
  calculated_price_incl_tax?: number;
  original_tax?: number;
  calculated_tax?: number;
  tax_rates?: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface WishlistResponse {
  wishlist: Wishlist;
}

export interface SharedWishlistResponse {
  wishlist: Wishlist;
  token: string;
}

export interface WishlistShareRequest {
  wishlist_id: string;
}

export interface WishlistItemRequest {
  productId: string;
  productVariantId: string;
  quantity?: number;
}
