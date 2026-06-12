// Generated automatically from Strapi Schema. Do not edit manually.
import { Shipper } from './shipper.types';

export interface Invoice {
  id: number;
  documentId: string;
  invoice_number: string;
  invoice_date: string;
  period_start?: string;
  period_end?: string;
  total_charges: number;
  status?: 'Paid' | 'Pending' | 'Overdue';
  shipper?: Shipper | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateInvoiceRequest {
  invoice_number: string;
  invoice_date: string;
  period_start?: string;
  period_end?: string;
  total_charges: number;
  status?: 'Paid' | 'Pending' | 'Overdue';
  shipper?: Shipper | null;
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {}

export interface InvoiceResponse {
  data: Invoice;
  meta: InvoiceMeta;
}

export interface InvoiceCollectionResponse {
  data: Invoice[];
  meta: InvoiceMeta;
}

export interface InvoiceFilters {
  [key: string]: any;
}

export interface InvoiceQueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: InvoiceFilters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface InvoicePathParams {
  id?: string | number;
  documentId?: string;
}

export interface InvoicePagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface InvoiceMeta {
  pagination?: InvoicePagination;
}

export interface InvoiceError {
  status: number;
  name: string;
  message: string;
  details?: any;
}
