export interface IShippingLocationAddress {
  address_1?: string;
  address_2?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  province?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
}

export interface IShippingLocation {
  id?: string;
  name?: string;
  address?: IShippingLocationAddress;
  address_id?: string;
  metadata?: any;
}

export interface IFulfillmentSet {
  id?: string;
  name?: string;
  type?: string;
  location?: IShippingLocation;
  locations?: IShippingLocation[];
}

export interface IServiceZone {
  id?: string;
  name?: string;
  // In Medusa v2, service_zone belongs to fulfillment_set (singular), not fulfillment_sets (plural)
  fulfillment_set?: IFulfillmentSet;
}

export interface IShippingOptions {
  id: string;
  name: string;
  price_incl_tax?: number;
  data?: any;
  metadata?: any;
  provider_id: string;
  profile_id: string;
  region_id: string;
  admin_only: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  amount?: number;
  is_return?: boolean;
  requirements?: any[];
  // Location information from service_zone -> fulfillment_set -> location -> address
  service_zone?: IServiceZone;
}

export interface IPaymentProviders {
  id: string;
  is_installed: boolean;
}

export interface IShippingOptionsResponse {
  shipping_options: IShippingOptions[];
}

export interface IPaymentProvidersResponse {
  payment_providers: IPaymentProviders[];
}
