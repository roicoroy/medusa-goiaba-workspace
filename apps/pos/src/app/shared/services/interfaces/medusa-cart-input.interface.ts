// Interface for adding items to cart - input data
export interface AddCartLineItemInput {
  variant_id: string;
  quantity: number;
  metadata?: any;
}

// Interface for updating cart line items
export interface UpdateCartLineItemInput {
  quantity: number;
  metadata?: any;
}

// Interface for cart update data
export interface UpdateCartInput {
  region_id?: string;
  email?: string;
  billing_address?: any;
  shipping_address?: any;
  line_items?: {
    id: string;
    quantity: number;
  }[];
  metadata?: any;
}
