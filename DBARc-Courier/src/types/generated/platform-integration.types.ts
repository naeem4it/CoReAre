// Generated automatically from Strapi Schema. Do not edit manually.
import { Shipper } from './shipper.types';

export interface PlatformIntegration {
  id: number;
  documentId: string;
  shipper?: Shipper | null;
  platform_type: string;
  store_url?: string;
  api_credentials?: any;
  sync_settings?: any;
  webhook_secret?: string;
  last_sync_at?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreatePlatformIntegrationRequest {
  shipper?: Shipper | null;
  platform_type: string;
  store_url?: string;
  api_credentials?: any;
  sync_settings?: any;
  webhook_secret?: string;
  last_sync_at?: string;
}

export interface UpdatePlatformIntegrationRequest extends Partial<CreatePlatformIntegrationRequest> {}

export interface PlatformIntegrationResponse {
  data: PlatformIntegration;
  meta: PlatformIntegrationMeta;
}

export interface PlatformIntegrationCollectionResponse {
  data: PlatformIntegration[];
  meta: PlatformIntegrationMeta;
}

export interface PlatformIntegrationFilters {
  [key: string]: any;
}

export interface PlatformIntegrationQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: PlatformIntegrationFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface PlatformIntegrationPathParams {
  id?: string | number;
  documentId?: string;
}

export interface PlatformIntegrationPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface PlatformIntegrationMeta {
  pagination?: PlatformIntegrationPagination;
}

export interface PlatformIntegrationError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
