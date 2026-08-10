export interface IPaymentSession {
  id: string;
  created_at: string;
  updated_at: string;
  cart_id: string | null;
  cart: any; // TODO: Replace with proper cart interface
  provider_id: string;
  is_selected: boolean | null;
  is_initiated: boolean;
  status: string;
  data: Record<string, unknown>;
  idempotency_key: string;
  amount: number;
  payment_authorized_at?: string;
} 