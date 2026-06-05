// Generated automatically from Strapi Schema. Do not edit manually.

export interface Region {
  id: number;
  documentId: string;
  parent?: Region | null;
  name: string;
  type?: string;
  geo_polygon?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateRegionRequest {
  parent?: Region | null;
  name: string;
  type?: string;
  geo_polygon?: any;
}

export interface UpdateRegionRequest extends Partial<CreateRegionRequest> {}

export interface RegionResponse {
  data: Region;
  meta: RegionMeta;
}

export interface RegionCollectionResponse {
  data: Region[];
  meta: RegionMeta;
}

export interface RegionFilters {
  [key: string]: any;
}

export interface RegionQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: RegionFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface RegionPathParams {
  id?: string | number;
  documentId?: string;
}

export interface RegionPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface RegionMeta {
  pagination?: RegionPagination;
}

export interface RegionError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
