// Generated automatically from Strapi Schema. Do not edit manually.
import { Rider } from './rider.types';
import { Parcel } from './parcel.types';

export interface DeliverySheet {
  id: number;
  documentId: string;
  sheet_number: string;
  sheet_date: string;
  rider?: Rider | null;
  route_code?: string;
  custom_name?: string;
  parcels?: Parcel[];
  status?: 'Pending' | 'Out For Delivery' | 'Completed';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateDeliverySheetRequest {
  sheet_number: string;
  sheet_date: string;
  rider?: Rider | null;
  route_code?: string;
  custom_name?: string;
  parcels?: Parcel[];
  status?: 'Pending' | 'Out For Delivery' | 'Completed';
}

export interface UpdateDeliverySheetRequest extends Partial<CreateDeliverySheetRequest> {}

export interface DeliverySheetResponse {
  data: DeliverySheet;
  meta: DeliverySheetMeta;
}

export interface DeliverySheetCollectionResponse {
  data: DeliverySheet[];
  meta: DeliverySheetMeta;
}

export interface DeliverySheetFilters {
  [key: string]: any;
}

export interface DeliverySheetQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: DeliverySheetFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface DeliverySheetPathParams {
  id?: string | number;
  documentId?: string;
}

export interface DeliverySheetPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface DeliverySheetMeta {
  pagination?: DeliverySheetPagination;
}

export interface DeliverySheetError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
