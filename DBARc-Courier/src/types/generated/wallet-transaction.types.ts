// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { User } from './user.types';

export interface WalletTransaction {
  id: number;
  documentId: string;
  amount: number;
  type: 'credit' | 'debit';
  category: 'cod_collection' | 'delivery_fee' | 'commission' | 'withdrawal' | 'gst';
  status?: 'pending' | 'completed' | 'cancelled';
  description?: string;
  tenant?: Tenant | null;
  user?: User | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateWalletTransactionRequest {
  amount: number;
  type: 'credit' | 'debit';
  category: 'cod_collection' | 'delivery_fee' | 'commission' | 'withdrawal' | 'gst';
  status?: 'pending' | 'completed' | 'cancelled';
  description?: string;
  tenant?: Tenant | null;
  user?: User | null;
}

export interface UpdateWalletTransactionRequest extends Partial<CreateWalletTransactionRequest> {}

export interface WalletTransactionResponse {
  data: WalletTransaction;
  meta: WalletTransactionMeta;
}

export interface WalletTransactionCollectionResponse {
  data: WalletTransaction[];
  meta: WalletTransactionMeta;
}

export interface WalletTransactionFilters {
  [key: string]: any;
}

export interface WalletTransactionQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: WalletTransactionFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface WalletTransactionPathParams {
  id?: string | number;
  documentId?: string;
}

export interface WalletTransactionPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface WalletTransactionMeta {
  pagination?: WalletTransactionPagination;
}

export interface WalletTransactionError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
