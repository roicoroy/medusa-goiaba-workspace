export interface MedusaCategory {
  id: string;
  name: string;
  description?: string;
  handle: string;
  mpath?: string;
  is_active: boolean;
  is_internal: boolean;
  parent_category_id?: string;
  parent_category?: MedusaCategory;
  category_children?: MedusaCategory[];
  products?: any[];
  created_at: string;
  updated_at: string;
  rank?: number;
  metadata?: {
    image_url?: string;
    image_uploaded_at?: string;
    [key: string]: any;
  };
}

export interface MedusaProductsCategoriesResponse {
  product_categories: MedusaCategory[];
  count: number;
  offset: number;
  limit: number;
}
