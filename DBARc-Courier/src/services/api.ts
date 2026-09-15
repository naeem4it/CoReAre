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
  getAll: async (params?: string): Promise<StrapiCollectionResponse<any>> => {
    try {
      // 1. Fetch users with roles and tenant
      const response = await apiClient.get('/users?populate=role_definition,tenant,role');
      const users: any[] = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];

      // 2. Resolve current user/tenant ID for strict multi-tenant isolation
      let currentTenantId: any = null;
      if (typeof window !== 'undefined') {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const userObj = JSON.parse(userStr);
            currentTenantId = userObj.tenant?.id || userObj.tenantId || (typeof userObj.tenant === 'number' ? userObj.tenant : null);
          }
        } catch (e) {
          // ignore
        }
      }

      // 3. Filter for active users with the 'Rider' role belonging strictly to this tenant
      const riderUsers = users.filter((u: any) => {
        // Multi-tenant check: must belong to the active courier tenant
        if (currentTenantId) {
          const uTenantId = u.tenant?.id || (typeof u.tenant === 'number' ? u.tenant : null);
          if (uTenantId && Number(uTenantId) !== Number(currentTenantId)) {
            return false;
          }
        }

        // Must not be deactivated/blocked
        if (u.blocked === true || u.isenable === false) {
          return false;
        }

        // Must have the 'Rider' role assigned in role_definition or role
        const hasRiderRole = (
          (Array.isArray(u.role_definition) && u.role_definition.some((rd: any) => (rd.role_name || rd.name || '').trim().toLowerCase() === 'rider')) ||
          (u.role_definition && (u.role_definition.role_name || u.role_definition.name || '').trim().toLowerCase() === 'rider') ||
          (u.role?.name || '').trim().toLowerCase() === 'rider'
        );

        return Boolean(hasRiderRole);
      }).map((u: any) => {
        const displayName = u.fullName && u.fullName.trim() && u.fullName !== '-'
          ? `${u.fullName.trim()} (${u.username})`
          : u.username;

        return {
          id: u.id,
          name: displayName,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          status: u.blocked ? 'inactive' : 'active',
          role: 'Rider',
          tenant: u.tenant,
          attributes: {
            name: displayName,
            username: u.username,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            status: u.blocked ? 'inactive' : 'active',
          }
        };
      });

      return {
        data: riderUsers,
        meta: {
          pagination: {
            page: 1,
            pageSize: riderUsers.length,
            pageCount: 1,
            total: riderUsers.length,
          }
        }
      } as any;
    } catch (err) {
      console.warn('Failed to load riders from users with role Rider:', err);
      return { data: [], meta: {} } as any;
    }
  },
  getById: async (id: number | string): Promise<StrapiResponse<any>> => {
    try {
      const response = await apiClient.get(`/users/${id}?populate=role_definition,tenant,role`);
      const u = response.data;
      const displayName = u.fullName && u.fullName.trim() && u.fullName !== '-'
        ? `${u.fullName.trim()} (${u.username})`
        : u.username;
      return {
        data: {
          id: u.id,
          name: displayName,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          status: u.blocked ? 'inactive' : 'active',
          role: 'Rider',
          tenant: u.tenant,
          attributes: {
            name: displayName,
            username: u.username,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            status: u.blocked ? 'inactive' : 'active',
          }
        }
      } as any;
    } catch (e) {
      console.warn('Failed to load rider by id:', e);
      return { data: null } as any;
    }
  },
  create: async (data: Partial<any>): Promise<StrapiResponse<any>> => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  update: async (id: number | string, data: Partial<any>): Promise<StrapiResponse<any>> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },
  delete: async (id: number | string): Promise<StrapiResponse<any>> => {
    const response = await apiClient.delete(`/users/${id}`);
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
