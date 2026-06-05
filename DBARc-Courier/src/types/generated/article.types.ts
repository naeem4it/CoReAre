// Generated automatically from Strapi Schema. Do not edit manually.
import { Author } from './author.types';
import { Category } from './category.types';

export interface Article {
  id: number;
  documentId: string;
  title?: string;
  description?: string;
  slug?: string;
  cover?: any;
  author?: Author | null;
  category?: Category | null;
  blocks?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateArticleRequest {
  title?: string;
  description?: string;
  slug?: string;
  cover?: any;
  author?: Author | null;
  category?: Category | null;
  blocks?: any;
}

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {}

export interface ArticleResponse {
  data: Article;
  meta: ArticleMeta;
}

export interface ArticleCollectionResponse {
  data: Article[];
  meta: ArticleMeta;
}

export interface ArticleFilters {
  [key: string]: any;
}

export interface ArticleQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ArticleFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ArticlePathParams {
  id?: string | number;
  documentId?: string;
}

export interface ArticlePagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ArticleMeta {
  pagination?: ArticlePagination;
}

export interface ArticleError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
