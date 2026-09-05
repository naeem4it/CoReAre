import { apiClient } from '@/shared/api/api-client';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@/types/auth.types';
import { User } from '@/types/generated/user.types';
import { Parcel } from '@/types/generated/parcel.types';
import { Rider } from '@/types/generated/rider.types';
import { StrapiCollectionResponse, StrapiResponse } from '@/types/strapi.types';

export const AuthService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/local', payload);
    return response.data;
  },
  
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/auth/local/register', payload);
    return response.data;
  },
  
  updateUser: async (id: number, payload: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, payload);
    return response.data;
  },
};

export const ParcelService = {
  getAll: async (params?: string): Promise<StrapiCollectionResponse<Parcel>> => {
    const response = await apiClient.get<StrapiCollectionResponse<Parcel>>(`/parcels${params || ''}`);
    return response.data;
  },
  getById: async (id: number | string, populate: string = '*'): Promise<StrapiResponse<Parcel>> => {
    const response = await apiClient.get<StrapiResponse<Parcel>>(`/parcels/${id}?populate=${populate}`);
    return response.data;
  },
  create: async (data: Partial<Parcel>): Promise<StrapiResponse<Parcel>> => {
    const response = await apiClient.post<StrapiResponse<Parcel>>('/parcels', { data });
    return response.data;
  },
  update: async (id: number | string, data: Partial<Parcel>): Promise<StrapiResponse<Parcel>> => {
    const response = await apiClient.put<StrapiResponse<Parcel>>(`/parcels/${id}`, { data });
    return response.data;
  },
  delete: async (id: number | string): Promise<StrapiResponse<Parcel>> => {
    const response = await apiClient.delete<StrapiResponse<Parcel>>(`/parcels/${id}`);
    return response.data;
  },
  cancel: async (id: number | string): Promise<StrapiResponse<Parcel>> => {
    const response = await apiClient.put<StrapiResponse<Parcel>>(`/parcels/${id}`, {
      data: { status: 'Cancelled' }
    });
    return response.data;
  },
};

export const RiderService = {
  getAll: async (params?: string): Promise<StrapiCollectionResponse<Rider>> => {
    const response = await apiClient.get<StrapiCollectionResponse<Rider>>(`/riders${params || ''}`);
    return response.data;
  },
  getById: async (id: number | string): Promise<StrapiResponse<Rider>> => {
    const response = await apiClient.get<StrapiResponse<Rider>>(`/riders/${id}?populate=*`);
    return response.data;
  },
  create: async (data: Partial<Rider>): Promise<StrapiResponse<Rider>> => {
    const response = await apiClient.post<StrapiResponse<Rider>>('/riders', { data });
    return response.data;
  },
  update: async (id: number | string, data: Partial<Rider>): Promise<StrapiResponse<Rider>> => {
    const response = await apiClient.put<StrapiResponse<Rider>>(`/riders/${id}`, { data });
    return response.data;
  },
  delete: async (id: number | string): Promise<StrapiResponse<Rider>> => {
    const response = await apiClient.delete<StrapiResponse<Rider>>(`/riders/${id}`);
    return response.data;
  },
};

export const ArrivalService = {
  getAll: async (params?: string): Promise<any> => {
    const response = await apiClient.get(`/arrivals${params || ''}`);
    return response.data;
  },
  createBatch: async (data: any): Promise<any> => {
    const response = await apiClient.post('/arrivals', { data });
    return response.data;
  },
};

export const DeliverySheetService = {
  getAll: async (params?: string): Promise<any> => {
    const response = await apiClient.get(`/delivery-sheets${params || ''}`);
    return response.data;
  },
  create: async (data: any): Promise<any> => {
    const response = await apiClient.post('/delivery-sheets', { data });
    return response.data;
  },
  update: async (id: number | string, data: any): Promise<any> => {
    const response = await apiClient.put(`/delivery-sheets/${id}`, { data });
    return response.data;
  },
  delete: async (id: number | string): Promise<any> => {
    const response = await apiClient.delete(`/delivery-sheets/${id}`);
    return response.data;
  },
};

export const InvoiceService = {
  getAll: async (params?: string): Promise<any> => {
    const response = await apiClient.get(`/invoices${params || ''}`);
    return response.data;
  },
  getById: async (id: number | string): Promise<any> => {
    const response = await apiClient.get(`/invoices/${id}?populate=*`);
    return response.data;
  },
  create: async (data: any): Promise<any> => {
    const response = await apiClient.post('/invoices', { data });
    return response.data;
  },
  update: async (id: number | string, data: any): Promise<any> => {
    const response = await apiClient.put(`/invoices/${id}`, { data });
    return response.data;
  },
  delete: async (id: number | string): Promise<any> => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
  },
};
