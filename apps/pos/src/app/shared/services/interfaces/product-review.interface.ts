/**
 * Product Review Interfaces
 * 
 * Interfaces for the @blegaut-product-reviews-enhanced plugin integration
 */

export interface MedusaProductReview {
  id: string;
  product_id: string;
  customer_id?: string | null;
  rating: number; // 1-5
  title: string;
  content: string;
  status?: 'pending' | 'approved' | 'rejected' | 'published';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  customer?: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    metadata?: Record<string, any> | null; // May contain picture, avatar_url from social logins
  } | null;
  admin_response?: {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
  } | null;
  metadata?: any | null;
}

export interface ProductReviewResponse {
  product_reviews?: MedusaProductReview[]; // API returns product_reviews
  reviews?: MedusaProductReview[]; // Fallback for compatibility
  count: number;
  offset?: number;
  limit?: number;
}

export interface CreateReviewPayload {
  reviews: Array<{
    product_id: string;
    rating: number; // 1-5
    title: string;
    content: string;
    order_id: string; // Required - must be from a completed order
    order_line_item_id: string; // Required - must be from a completed order line item
    images?: string[]; // Required by API - can be empty array
  }>;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

