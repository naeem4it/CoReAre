'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useAuthStore } from '@/shared/model/auth.store';
import { Plus, MapPin, Search } from 'lucide-react';
import axios from 'axios';

interface PickupLocation {
  id: number;
  location_name: string;
  address: string;
  city?: any;
  phone?: string;
  email?: string;
  status: boolean;
}

export default function PickupLocationsPage() {
  const { user, activeBusinessId } = useAuthStore();
  const [locations, setLocations] = React.useState<PickupLocation[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337').replace(/\/api$/, '');
      const token = useAuthStore.getState().accessToken;
      
      const response = await axios.get(`${apiRoot}/api/pickup-locations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          populate: ['city'],
          filters: {
            shipper: {
              id: {
                $eq: activeBusinessId
              }
            }
          }
        }
      });
      setLocations(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch pickup locations:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeBusinessId) {
      fetchLocations();
    }
  }, [activeBusinessId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pickup Locations</h1>
          <p className="text-slate-500 mt-1">Manage your dispatch sites and warehouses.</p>
        </div>
        <Button className="bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 rounded-xl px-5 h-11">
          <Plus className="w-5 h-5 mr-2" />
          Add Location
        </Button>
      </div>

      <Card className="rounded-[24px] border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search locations..." 
              className="pl-9 bg-white border-slate-200 rounded-xl h-10 w-full"
            />
          </div>
        </div>
        
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="font-semibold text-xs text-slate-500 uppercase tracking-wider p-4 border-b border-slate-100">Location Name</th>
                <th className="font-semibold text-xs text-slate-500 uppercase tracking-wider p-4 border-b border-slate-100">Address</th>
                <th className="font-semibold text-xs text-slate-500 uppercase tracking-wider p-4 border-b border-slate-100">City</th>
                <th className="font-semibold text-xs text-slate-500 uppercase tracking-wider p-4 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Loading locations...</td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium text-slate-600">No pickup locations found</p>
                    <p className="text-sm mt-1">Add your first warehouse to get started.</p>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{loc.location_name}</td>
                    <td className="p-4 text-slate-600 text-sm max-w-xs truncate">{loc.address}</td>
                    <td className="p-4 text-slate-600 text-sm">{loc.city?.name || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50">Edit</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
