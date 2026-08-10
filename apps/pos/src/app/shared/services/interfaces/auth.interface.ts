

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RetrievePasswordPayload {
  username: string;
}

export interface DetailsPayload {
  billing_address: Record<string, any>;
  shipping_address?: Record<string, any>;
  region_id?: string;
  email: string;
}

export interface IStrapiLoginData {
  identifier: string;
  password: string;
}
