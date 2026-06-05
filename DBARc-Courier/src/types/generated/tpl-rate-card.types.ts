// Generated automatically from Strapi Schema. Do not edit manually.
import { TPLPartner } from './tpl-partner.types';
import { Region } from './region.types';

export interface TPLRateCard {
  id: number;
  documentId: string;
  partner?: TPLPartner | null;
  origin_region?: Region | null;
  destination_region?: Region | null;
  price: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateTPLRateCardRequest {
  partner?: TPLPartner | null;
  origin_region?: Region | null;
  destination_region?: Region | null;
  price: number;
}

export interface UpdateTPLRateCardRequest extends Partial<CreateTPLRateCardRequest> {}

export interface TPLRateCardResponse {
  data: TPLRateCard;
  meta: TPLRateCardMeta;
}

export interface TPLRateCardCollectionResponse {
  data: TPLRateCard[];
  meta: TPLRateCardMeta;
}

export interface TPLRateCardFilters {
  [key: string]: any;
}

export interface TPLRateCardQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: TPLRateCardFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface TPLRateCardPathParams {
  id?: string | number;
  documentId?: string;
}

export interface TPLRateCardPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface TPLRateCardMeta {
  pagination?: TPLRateCardPagination;
}

export interface TPLRateCardError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
