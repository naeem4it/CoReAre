// Generated automatically from Strapi Schema. Do not edit manually.
import { Courier } from './courier.types';
import { CourierCity } from './courier-city.types';

export interface Parcel {
  id: number;
  documentId: string;
  tracking_number: string;
  status?: 'Total Booking' | 'Not Arrived' | 'Arrived' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper';
  cod_amount?: number;
  weight: number;
  delivery_charges: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  courier?: Courier | null;
  courier_city?: CourierCity | null;
  consignee_email?: string;
  consignee_alt_phone?: string;
  allow_to_open?: 'Yes' | 'No';
  comments?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateParcelRequest {
  tracking_number: string;
  status?: 'Total Booking' | 'Not Arrived' | 'Arrived' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper';
  cod_amount?: number;
  weight: number;
  delivery_charges: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  courier?: Courier | null;
  courier_city?: CourierCity | null;
  consignee_email?: string;
  consignee_alt_phone?: string;
  allow_to_open?: 'Yes' | 'No';
  comments?: string;
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
