// Generated automatically from Strapi Schema. Do not edit manually.
import { Rider } from './rider.types';
import { Parcel } from './parcel.types';

export interface RiderAssignment {
  id: number;
  documentId: string;
  rider?: Rider | null;
  parcel?: Parcel | null;
  assigned_at?: string;
  accepted_at?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRiderAssignmentRequest {
  rider?: Rider | null;
  parcel?: Parcel | null;
  assigned_at?: string;
  accepted_at?: string;
  status?: string;
}

export interface UpdateRiderAssignmentRequest extends Partial<CreateRiderAssignmentRequest> {}

export interface RiderAssignmentResponse {
  data: RiderAssignment;
  meta: RiderAssignmentMeta;
}

export interface RiderAssignmentCollectionResponse {
  data: RiderAssignment[];
  meta: RiderAssignmentMeta;
}

export interface RiderAssignmentFilters {
  [key: string]: any;
}

export interface RiderAssignmentQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RiderAssignmentFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RiderAssignmentPathParams {
  id?: string | number;
  documentId?: string;
}

export interface RiderAssignmentPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RiderAssignmentMeta {
  pagination?: RiderAssignmentPagination;
}

export interface RiderAssignmentError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
