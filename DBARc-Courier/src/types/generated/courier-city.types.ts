// Generated automatically from Strapi Schema. Do not edit manually.
import { Courier } from './courier.types';
import { City } from './city.types';
import { Parcel } from './parcel.types';

export interface CourierCity {
  id: number;
  documentId: string;
  couriers?: Courier[];
  cities?: City[];
  parcel?: Parcel | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateCourierCityRequest {
  couriers?: Courier[];
  cities?: City[];
  parcel?: Parcel | null;
}

export interface UpdateCourierCityRequest extends Partial<CreateCourierCityRequest> {}

export interface CourierCityResponse {
  data: CourierCity;
  meta: CourierCityMeta;
}

export interface CourierCityCollectionResponse {
  data: CourierCity[];
  meta: CourierCityMeta;
}

export interface CourierCityFilters {
  [key: string]: any;
}

export interface CourierCityQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: CourierCityFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface CourierCityPathParams {
  id?: string | number;
  documentId?: string;
}

export interface CourierCityPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface CourierCityMeta {
  pagination?: CourierCityPagination;
}

export interface CourierCityError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
