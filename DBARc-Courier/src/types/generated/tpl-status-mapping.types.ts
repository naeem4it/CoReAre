// Generated automatically from Strapi Schema. Do not edit manually.
import { TPLPartner } from './tpl-partner.types';

export interface TPLStatusMapping {
  id: number;
  documentId: string;
  partner?: TPLPartner | null;
  external_status_code: string;
  internal_status: 'Total Booking' | 'Not Arrived' | 'Arrived' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateTPLStatusMappingRequest {
  partner?: TPLPartner | null;
  external_status_code: string;
  internal_status: 'Total Booking' | 'Not Arrived' | 'Arrived' | 'Arrived At Destination' | 'Out For delivery' | 'Delivered' | 'Failed Attempt' | 'Ready To Return' | 'Return Dispatched' | 'Return to Shipper';
}

export interface UpdateTPLStatusMappingRequest extends Partial<CreateTPLStatusMappingRequest> {}

export interface TPLStatusMappingResponse {
  data: TPLStatusMapping;
  meta: TPLStatusMappingMeta;
}

export interface TPLStatusMappingCollectionResponse {
  data: TPLStatusMapping[];
  meta: TPLStatusMappingMeta;
}

export interface TPLStatusMappingFilters {
  [key: string]: any;
}

export interface TPLStatusMappingQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: TPLStatusMappingFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface TPLStatusMappingPathParams {
  id?: string | number;
  documentId?: string;
}

export interface TPLStatusMappingPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface TPLStatusMappingMeta {
  pagination?: TPLStatusMappingPagination;
}

export interface TPLStatusMappingError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
