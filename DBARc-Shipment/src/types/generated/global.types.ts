// Generated automatically from Strapi Schema. Do not edit manually.

export interface Global {
  id: number;
  documentId: string;
  siteName: string;
  favicon?: any;
  siteDescription: string;
  defaultSeo?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateGlobalRequest {
  siteName: string;
  favicon?: any;
  siteDescription: string;
  defaultSeo?: any;
}

export interface UpdateGlobalRequest extends Partial<CreateGlobalRequest> {}

export interface GlobalResponse {
  data: Global;
  meta: GlobalMeta;
}

export interface GlobalCollectionResponse {
  data: Global[];
  meta: GlobalMeta;
}

export interface GlobalFilters {
  [key: string]: any;
}

export interface GlobalQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: GlobalFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface GlobalPathParams {
  id?: string | number;
  documentId?: string;
}

export interface GlobalPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface GlobalMeta {
  pagination?: GlobalPagination;
}

export interface GlobalError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
