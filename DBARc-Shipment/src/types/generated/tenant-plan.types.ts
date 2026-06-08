// Generated automatically from Strapi Schema. Do not edit manually.

export interface TenantPlan {
  id: number;
  documentId: string;
  name: string;
  features?: any;
  limits?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateTenantPlanRequest {
  name: string;
  features?: any;
  limits?: any;
}

export interface UpdateTenantPlanRequest extends Partial<CreateTenantPlanRequest> {}

export interface TenantPlanResponse {
  data: TenantPlan;
  meta: TenantPlanMeta;
}

export interface TenantPlanCollectionResponse {
  data: TenantPlan[];
  meta: TenantPlanMeta;
}

export interface TenantPlanFilters {
  [key: string]: any;
}

export interface TenantPlanQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: TenantPlanFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface TenantPlanPathParams {
  id?: string | number;
  documentId?: string;
}

export interface TenantPlanPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface TenantPlanMeta {
  pagination?: TenantPlanPagination;
}

export interface TenantPlanError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
