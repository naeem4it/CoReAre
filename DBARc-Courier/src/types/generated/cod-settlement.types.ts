// Generated automatically from Strapi Schema. Do not edit manually.
import { Tenant } from './tenant.types';
import { Shipper } from './shipper.types';

export interface CODSettlement {
  id: number;
  documentId: string;
  tenant?: Tenant | null;
  shipper?: Shipper | null;
  total_cod_collected: number;
  net_payable: number;
  status?: 'calculated' | 'approved' | 'processing' | 'paid' | 'disputed';
  paid_at?: string;
  invoice_number?: string;
  invoice_date?: string;
  period_start?: string;
  period_end?: string;
  service_charges?: number;
  ibft_charges?: number;
  delivered_count?: number;
  returned_count?: number;
  statement_pdf?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateCODSettlementRequest {
  tenant?: Tenant | null;
  shipper?: Shipper | null;
  total_cod_collected: number;
  net_payable: number;
  status?: 'calculated' | 'approved' | 'processing' | 'paid' | 'disputed';
  paid_at?: string;
  invoice_number?: string;
  invoice_date?: string;
  period_start?: string;
  period_end?: string;
  service_charges?: number;
  ibft_charges?: number;
  delivered_count?: number;
  returned_count?: number;
  statement_pdf?: string;
}

export interface UpdateCODSettlementRequest extends Partial<CreateCODSettlementRequest> {}

export interface CODSettlementResponse {
  data: CODSettlement;
  meta: CODSettlementMeta;
}

export interface CODSettlementCollectionResponse {
  data: CODSettlement[];
  meta: CODSettlementMeta;
}

export interface CODSettlementFilters {
  [key: string]: any;
}

export interface CODSettlementQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: CODSettlementFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface CODSettlementPathParams {
  id?: string | number;
  documentId?: string;
}

export interface CODSettlementPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface CODSettlementMeta {
  pagination?: CODSettlementPagination;
}

export interface CODSettlementError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
