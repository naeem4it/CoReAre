// Generated automatically from Strapi Schema. Do not edit manually.
import { Article } from './article.types';

export interface Author {
  id: number;
  documentId: string;
  name?: string;
  avatar?: any;
  email?: string;
  articles?: Article[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateAuthorRequest {
  name?: string;
  avatar?: any;
  email?: string;
  articles?: Article[];
}

export interface UpdateAuthorRequest extends Partial<CreateAuthorRequest> {}

export interface AuthorResponse {
  data: Author;
  meta: AuthorMeta;
}

export interface AuthorCollectionResponse {
  data: Author[];
  meta: AuthorMeta;
}

export interface AuthorFilters {
  [key: string]: any;
}

export interface AuthorQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: AuthorFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface AuthorPathParams {
  id?: string | number;
  documentId?: string;
}

export interface AuthorPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface AuthorMeta {
  pagination?: AuthorPagination;
}

export interface AuthorError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
