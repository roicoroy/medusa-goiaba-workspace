import { MedusaProduct } from './medusa-product.interface';

export interface MedusaCollection {
  id: string;
  title: string;
  handle: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  metadata?: {
    [key: string]: any;
  };
  products?: MedusaProduct[];
}

export interface MedusaCollectionsResponse {
  collections: MedusaCollection[];
  count: number;
  offset: number;
  limit: number;
}

