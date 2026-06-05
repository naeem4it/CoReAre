// Generated automatically from Strapi Schema. Do not edit manually.
import { Parcel } from './parcel.types';
import { Rider } from './rider.types';

export interface DeliveryAttempt {
  id: number;
  documentId: string;
  parcel?: Parcel | null;
  rider?: Rider | null;
  attempt_time?: string;
  status: string;
  proof_of_delivery_url?: string;
  recipient_name?: string;
  recipient_relation?: string;
  failure_reason?: string;
  geo_location?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateDeliveryAttemptRequest {
  parcel?: Parcel | null;
  rider?: Rider | null;
  attempt_time?: string;
  status: string;
  proof_of_delivery_url?: string;
  recipient_name?: string;
  recipient_relation?: string;
  failure_reason?: string;
  geo_location?: any;
}

export interface UpdateDeliveryAttemptRequest extends Partial<CreateDeliveryAttemptRequest> {}

export interface DeliveryAttemptResponse {
  data: DeliveryAttempt;
  meta: DeliveryAttemptMeta;
}

export interface DeliveryAttemptCollectionResponse {
  data: DeliveryAttempt[];
  meta: DeliveryAttemptMeta;
}

export interface DeliveryAttemptFilters {
  [key: string]: any;
}

export interface DeliveryAttemptQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: DeliveryAttemptFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface DeliveryAttemptPathParams {
  id?: string | number;
  documentId?: string;
}

export interface DeliveryAttemptPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface DeliveryAttemptMeta {
  pagination?: DeliveryAttemptPagination;
}

export interface DeliveryAttemptError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
