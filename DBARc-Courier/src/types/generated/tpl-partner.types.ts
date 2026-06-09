// Generated automatically from Strapi Schema. Do not edit manually.

export interface TPLPartner {
  id: number;
  documentId: string;
  name: string;
  api_credentials?: any;
  status?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateTPLPartnerRequest {
  name: string;
  api_credentials?: any;
  status?: string;
}

export interface UpdateTPLPartnerRequest extends Partial<CreateTPLPartnerRequest> {}

export interface TPLPartnerResponse {
  data: TPLPartner;
  meta: TPLPartnerMeta;
}

export interface TPLPartnerCollectionResponse {
  data: TPLPartner[];
  meta: TPLPartnerMeta;
}

export interface TPLPartnerFilters {
  [key: string]: any;
}

export interface TPLPartnerQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: TPLPartnerFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface TPLPartnerPathParams {
  id?: string | number;
  documentId?: string;
}

export interface TPLPartnerPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface TPLPartnerMeta {
  pagination?: TPLPartnerPagination;
}

export interface TPLPartnerError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
