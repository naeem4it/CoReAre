// Generated automatically from Strapi Schema. Do not edit manually.
import { Role } from './role.types';

export interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  provider?: string;
  confirmed?: boolean;
  blocked?: boolean;
  fullName?: string;
  businessName?: string;
  role?: Role | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  provider?: string;
  confirmed?: boolean;
  blocked?: boolean;
  fullName?: string;
  businessName?: string;
  role?: Role | null;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}

export interface UserResponse {
  data: User;
  meta: UserMeta;
}

export interface UserCollectionResponse {
  data: User[];
  meta: UserMeta;
}

export interface UserFilters {
  [key: string]: any;
}

export interface UserQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: UserFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface UserPathParams {
  id?: string | number;
  documentId?: string;
}

export interface UserPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface UserMeta {
  pagination?: UserPagination;
}

export interface UserError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
