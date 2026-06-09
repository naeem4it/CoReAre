import { apiClient } from '@/shared/api/api-client';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@/types/auth.types';
import { User } from '@/types/generated/user.types';
import { Parcel } from '@/types/generated/parcel.types';
import { Rider } from '@/types/generated/rider.types';
import { StrapiCollectionResponse } from '@/types/strapi.types';

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
};

export const RiderService = {
  getAll: async (params?: string): Promise<StrapiCollectionResponse<Rider>> => {
    const response = await apiClient.get<StrapiCollectionResponse<Rider>>(`/riders${params || ''}`);
    return response.data;
  },
};
