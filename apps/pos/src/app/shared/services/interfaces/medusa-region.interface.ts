export interface MedusaRegion {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
  tax_rates?: any[];
  tax_code?: string;
  gift_cards_taxable: boolean;
  automatic_taxes: boolean;
  countries: MedusaCountry[];
  tax_provider_id?: string;
  tax_provider?: any;
  payment_providers: any[];
  fulfillment_providers: any[];
  includes_tax?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  metadata?: any;
}

export interface MedusaCountry {
  id?: number;
  iso_2: string;
  iso_3: string;
  num_code: string;
  name: string;
  display_name: string;
  region_id?: string;
  region?: MedusaRegion;
}

export interface NewCountryListModel {
  country: string;
  region_id: string;
  label: string;
  currency_code: string;
}

export interface MedusaRegionListResponse {
  regions: MedusaRegion[];
  count: number;
  offset: number;
  limit: number;
}
