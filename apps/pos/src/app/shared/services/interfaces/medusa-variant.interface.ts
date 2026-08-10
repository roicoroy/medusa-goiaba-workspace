export interface MedusaVariant {
  id: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  ean?: string | null;
  upc?: string | null;
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
  metadata?: any;
  variant_rank: number;
  product_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  options?: any[];
  calculated_price?: any;
  // Legacy properties for backward compatibility
  inventory_quantity?: number;
  prices?: any[];
}
