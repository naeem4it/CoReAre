// Generated automatically from Strapi Schema. Do not edit manually.
import { Parcel } from './parcel.types';
import { Rider } from './rider.types';

export interface Rating {
  id: number;
  documentId: string;
  parcel?: Parcel | null;
  rider?: Rider | null;
  stars: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRatingRequest {
  parcel?: Parcel | null;
  rider?: Rider | null;
  stars: number;
  feedback?: string;
}

export interface UpdateRatingRequest extends Partial<CreateRatingRequest> {}

export interface RatingResponse {
  data: Rating;
  meta: RatingMeta;
}

export interface RatingCollectionResponse {
  data: Rating[];
  meta: RatingMeta;
}

export interface RatingFilters {
  [key: string]: any;
}

export interface RatingQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RatingFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RatingPathParams {
  id?: string | number;
  documentId?: string;
}

export interface RatingPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RatingMeta {
  pagination?: RatingPagination;
}

export interface RatingError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
