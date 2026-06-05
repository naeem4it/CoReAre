// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';

export interface RoleDefinition {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  role_name: string;
  permissions: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRoleDefinitionRequest {
  tenant?: Tenant | null;
  role_name: string;
  permissions: any;
}

export interface UpdateRoleDefinitionRequest extends Partial<CreateRoleDefinitionRequest> {}

export interface RoleDefinitionResponse {
  data: RoleDefinition;
  meta: RoleDefinitionMeta;
}

export interface RoleDefinitionCollectionResponse {
  data: RoleDefinition[];
  meta: RoleDefinitionMeta;
}

export interface RoleDefinitionFilters {
  [key: string]: any;
}

export interface RoleDefinitionQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RoleDefinitionFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RoleDefinitionPathParams {
  id?: string | number;
  documentId?: string;
}

export interface RoleDefinitionPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RoleDefinitionMeta {
  pagination?: RoleDefinitionPagination;
}

export interface RoleDefinitionError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
