export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StrapiMeta {
  pagination?: StrapiPagination;
}

export interface StrapiResponse<T> {
  data: T;
  meta: StrapiMeta;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta: StrapiMeta;
}

export interface StrapiErrorDetails {
  errors?: Array<{
    path: string[];
    message: string;
    name: string;
  }>;
  [key: string]: any;
}

export interface StrapiError {
  status: number;
  name: string;
  message: string;
  details?: StrapiErrorDetails;
}

export interface StrapiErrorResponse {
  data: null;
  error: StrapiError;
}

// Added extra requested generic wrappers
export interface StrapiEntity<T> {
  id: number;
  documentId: string;
  attributes: T;
}

export interface StrapiUploadFile {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: any;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  provider_metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export type StrapiRelation<T> = T;

export type ApiError = StrapiError;
export type ApiResponse<T> = StrapiResponse<T>;
export type PaginationResponse<T> = StrapiCollectionResponse<T>;
