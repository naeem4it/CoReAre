// Generated automatically from Strapi Schema. Do not edit manually.

export interface Parcel {
  id: number;
  documentId: string;
  tracking_number: string;
  status?: 'created' | 'picked' | 'in_hub' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  cod_amount?: number;
  weight: number;
  delivery_charges: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateParcelRequest {
  tracking_number: string;
  status?: 'created' | 'picked' | 'in_hub' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  cod_amount?: number;
  weight: number;
  delivery_charges: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
}

export interface UpdateParcelRequest extends Partial<CreateParcelRequest> {}

export interface ParcelResponse {
  data: Parcel;
  meta: ParcelMeta;
}

export interface ParcelCollectionResponse {
  data: Parcel[];
  meta: ParcelMeta;
}

export interface ParcelFilters {
  [key: string]: any;
}

export interface ParcelQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ParcelFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ParcelPathParams {
  id?: string | number;
  documentId?: string;
}

export interface ParcelPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ParcelMeta {
  pagination?: ParcelPagination;
}

export interface ParcelError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
