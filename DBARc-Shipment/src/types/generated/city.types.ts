// Generated automatically from Strapi Schema. Do not edit manually.
import { CourierCity } from './courier-city.types';

export interface City {
  id: number;
  documentId: string;
  CityName?: string;
  Active?: boolean;
  courier_cities?: CourierCity[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateCityRequest {
  CityName?: string;
  Active?: boolean;
  courier_cities?: CourierCity[];
}

export interface UpdateCityRequest extends Partial<CreateCityRequest> {}

export interface CityResponse {
  data: City;
  meta: CityMeta;
}

export interface CityCollectionResponse {
  data: City[];
  meta: CityMeta;
}

export interface CityFilters {
  [key: string]: any;
}

export interface CityQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: CityFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface CityPathParams {
  id?: string | number;
  documentId?: string;
}

export interface CityPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface CityMeta {
  pagination?: CityPagination;
}

export interface CityError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
