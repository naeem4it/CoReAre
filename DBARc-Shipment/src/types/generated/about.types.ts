// Generated automatically from Strapi Schema. Do not edit manually.

export interface About {
  id: number;
  documentId: string;
  title?: string;
  blocks?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateAboutRequest {
  title?: string;
  blocks?: any;
}

export interface UpdateAboutRequest extends Partial<CreateAboutRequest> {}

export interface AboutResponse {
  data: About;
  meta: AboutMeta;
}

export interface AboutCollectionResponse {
  data: About[];
  meta: AboutMeta;
}

export interface AboutFilters {
  [key: string]: any;
}

export interface AboutQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: AboutFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface AboutPathParams {
  id?: string | number;
  documentId?: string;
}

export interface AboutPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface AboutMeta {
  pagination?: AboutPagination;
}

export interface AboutError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
