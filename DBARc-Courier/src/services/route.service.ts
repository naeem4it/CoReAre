import { apiClient } from '@/shared/api/api-client';

export interface RouteItem {
  id: number;
  documentId?: string;
  route_code: string;
  name: string;
  type: 'Delivery' | 'Pickup' | 'Return' | 'Special' | 'ThirdParty';
  status: 'Active' | 'Inactive';
  description?: string;
  areas?: string[] | string;
  postal_codes?: string;
  office?: any;
  city?: any;
  zone?: any;
  tenant?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteAssignmentItem {
  id: number;
  documentId?: string;
  assignment_date: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'Full Day';
  vehicle_number?: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  notes?: string;
  office?: any;
  rider?: any;
  route?: any;
  tenant?: any;
  createdAt?: string;
  updatedAt?: string;
}

export const RouteService = {
  getAll: async (params: string = '?populate=*&sort[0]=createdAt:desc&pagination[pageSize]=100'): Promise<{ data: RouteItem[], meta: any }> => {
    const res = await apiClient.get(`/routes${params}`);
    return res.data;
  },

  getById: async (id: number | string): Promise<{ data: RouteItem }> => {
    const res = await apiClient.get(`/routes/${id}?populate=*`);
    return res.data;
  },

  create: async (data: Partial<RouteItem>): Promise<{ data: RouteItem }> => {
    const res = await apiClient.post('/routes', { data });
    return res.data;
  },

  update: async (id: number | string, data: Partial<RouteItem>): Promise<{ data: RouteItem }> => {
    const res = await apiClient.put(`/routes/${id}`, { data });
    return res.data;
  },

  delete: async (id: number | string): Promise<any> => {
    const res = await apiClient.delete(`/routes/${id}`);
    return res.data;
  },

  // Auto-generate suggested route code based on City + Zone + Sequence
  generateSuggestedCode: (cityName: string = '', zoneName: string = '', existingCount: number = 0): string => {
    const cClean = cityName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'HUB';
    const zClean = zoneName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'ZONE';
    const seq = String(existingCount + 1).padStart(2, '0');
    return `${cClean}-${zClean}-${seq}`;
  },
};

export const RouteAssignmentService = {
  getAll: async (params: string = '?populate=*&sort[0]=assignment_date:desc&pagination[pageSize]=100'): Promise<{ data: RouteAssignmentItem[], meta: any }> => {
    const res = await apiClient.get(`/route-assignments${params}`);
    return res.data;
  },

  create: async (data: Partial<RouteAssignmentItem>): Promise<{ data: RouteAssignmentItem }> => {
    const res = await apiClient.post('/route-assignments', { data });
    return res.data;
  },

  update: async (id: number | string, data: Partial<RouteAssignmentItem>): Promise<{ data: RouteAssignmentItem }> => {
    const res = await apiClient.put(`/route-assignments/${id}`, { data });
    return res.data;
  },

  delete: async (id: number | string): Promise<any> => {
    const res = await apiClient.delete(`/route-assignments/${id}`);
    return res.data;
  },

  // Get active route assignment for a given rider on an operational date
  getByRiderAndDate: async (riderId: number | string, dateStr: string): Promise<RouteAssignmentItem | null> => {
    try {
      const res = await apiClient.get(`/route-assignments?filters[rider][id][$eq]=${riderId}&filters[assignment_date][$eq]=${dateStr}&filters[status][$eq]=Active&populate=*`);
      const items = res.data?.data || [];
      return items.length > 0 ? items[0] : null;
    } catch (e) {
      console.warn('Could not query rider route assignment:', e);
      return null;
    }
  },
};
