// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';

export interface EventStream {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  entity_type: string;
  entity_id: string;
  event_type: string;
  payload?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateEventStreamRequest {
  tenant?: Tenant | null;
  entity_type: string;
  entity_id: string;
  event_type: string;
  payload?: any;
}

export interface UpdateEventStreamRequest extends Partial<CreateEventStreamRequest> {}

export interface EventStreamResponse {
  data: EventStream;
  meta: EventStreamMeta;
}

export interface EventStreamCollectionResponse {
  data: EventStream[];
  meta: EventStreamMeta;
}

export interface EventStreamFilters {
  [key: string]: any;
}

export interface EventStreamQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: EventStreamFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface EventStreamPathParams {
  id?: string | number;
  documentId?: string;
}

export interface EventStreamPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface EventStreamMeta {
  pagination?: EventStreamPagination;
}

export interface EventStreamError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
