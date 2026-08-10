export interface ICustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  billing_address_id?: string;
  has_account: boolean;
  company_name?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  metadata?: Record<string, any>;
  orders?: any[];
}

export interface ICustomerRegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone?: number;
}

export interface ICustomerLoginData {
  email: string;
  password?: string;
}
