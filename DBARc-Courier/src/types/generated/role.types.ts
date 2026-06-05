// Generated automatically from Strapi Schema. Do not edit manually.

export interface Role {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  type?: string;
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {}

export interface RoleResponse {
  data: Role;
  meta: RoleMeta;
}

export interface RoleCollectionResponse {
  data: Role[];
  meta: RoleMeta;
}

export interface RoleFilters {
  [key: string]: any;
}

export interface RoleQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RoleFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RolePathParams {
  id?: string | number;
  documentId?: string;
}

export interface RolePagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RoleMeta {
  pagination?: RolePagination;
}

export interface RoleError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
