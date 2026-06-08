// Generated automatically from Strapi Schema. Do not edit manually.
import { Article } from './article.types';

export interface Category {
  id: number;
  documentId: string;
  name?: string;
  slug?: string;
  articles?: Article[];
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateCategoryRequest {
  name?: string;
  slug?: string;
  articles?: Article[];
  description?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CategoryResponse {
  data: Category;
  meta: CategoryMeta;
}

export interface CategoryCollectionResponse {
  data: Category[];
  meta: CategoryMeta;
}

export interface CategoryFilters {
  [key: string]: any;
}

export interface CategoryQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: CategoryFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface CategoryPathParams {
  id?: string | number;
  documentId?: string;
}

export interface CategoryPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface CategoryMeta {
  pagination?: CategoryPagination;
}

export interface CategoryError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
