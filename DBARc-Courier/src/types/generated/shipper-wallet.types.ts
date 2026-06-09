// Generated automatically from Strapi Schema. Do not edit manually.
import { Shipper } from './shipper.types';

export interface ShipperWallet {
  id: number;
  documentId: string;
  shipper?: Shipper | null;
  balance?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateShipperWalletRequest {
  shipper?: Shipper | null;
  balance?: number;
  currency?: string;
}

export interface UpdateShipperWalletRequest extends Partial<CreateShipperWalletRequest> {}

export interface ShipperWalletResponse {
  data: ShipperWallet;
  meta: ShipperWalletMeta;
}

export interface ShipperWalletCollectionResponse {
  data: ShipperWallet[];
  meta: ShipperWalletMeta;
}

export interface ShipperWalletFilters {
  [key: string]: any;
}

export interface ShipperWalletQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ShipperWalletFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ShipperWalletPathParams {
  id?: string | number;
  documentId?: string;
}

export interface ShipperWalletPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ShipperWalletMeta {
  pagination?: ShipperWalletPagination;
}

export interface ShipperWalletError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
