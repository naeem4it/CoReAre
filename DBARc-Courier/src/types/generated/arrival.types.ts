// Generated automatically from Strapi Schema. Do not edit manually.
import { Rider } from './rider.types';
import { Parcel } from './parcel.types';

export interface Arrival {
  id: number;
  documentId: string;
  arrival_date: string;
  rider?: Rider | null;
  parcels?: Parcel[];
  total_pieces?: number;
  total_weight?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateArrivalRequest {
  arrival_date: string;
  rider?: Rider | null;
  parcels?: Parcel[];
  total_pieces?: number;
  total_weight?: number;
}

export interface UpdateArrivalRequest extends Partial<CreateArrivalRequest> {}

export interface ArrivalResponse {
  data: Arrival;
  meta: ArrivalMeta;
}

export interface ArrivalCollectionResponse {
  data: Arrival[];
  meta: ArrivalMeta;
}

export interface ArrivalFilters {
  [key: string]: any;
}

export interface ArrivalQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ArrivalFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ArrivalPathParams {
  id?: string | number;
  documentId?: string;
}

export interface ArrivalPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ArrivalMeta {
  pagination?: ArrivalPagination;
}

export interface ArrivalError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
