'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { apiClient } from '@/shared/api/api-client';
import { Shield, ShieldAlert, Plus, Edit2, Trash2, CheckSquare, Square, Search } from 'lucide-react';

interface RoleDefinition {
  id: number;
  role_name: string;
  permissions: string[];
}

export default function CourierRolesPage() {
  const [roles, setRoles] = React.useState<RoleDefinition[]>([]);
  const [filteredRoles, setFilteredRoles] = React.useState<RoleDefinition[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleDefinition | null>(null);
  const [roleName, setRoleName] = React.useState('');
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);

  // List of available permissions (extensible)
  const AVAILABLE_PERMISSIONS = [
    { key: 'manage_finance', label: 'Manage Finance', description: 'Access financial ledgers, COD settlements, and invoice records.' },
    { key: 'view_shipments', label: 'View Shipments', description: 'Browse and search parcels and status histories.' },
    { key: 'create_shipment', label: 'Create Shipments', description: 'Book new parcels individually or via bulk upload templates.' },
    { key: 'manage_riders', label: 'Manage Riders & Assignments', description: 'Hire, suspend, and configure commission rates for riders.' },
  ];

  const fetchRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/role-definitions');
      // Handle Strapi response structure
      const rawData = response.data?.data || [];
      const mapped = rawData.map((item: any) => ({
        id: item.id,
        role_name: item.role_name,
        permissions: Array.isArray(item.permissions) ? item.permissions : [],
      }));
      setRoles(mapped);
      setFilteredRoles(mapped);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
      setError('Failed to load role definitions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRoles();
  }, []);

  // Filter roles based on search
  React.useEffect(() => {
    if (!searchQuery) {
      setFilteredRoles(roles);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRoles(
        roles.filter((role) => role.role_name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, roles]);

  const handleOpenAddModal = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: RoleDefinition) => {
    setEditingRole(role);
    setRoleName(role.role_name);
    setSelectedPermissions(role.permissions);
    setIsModalOpen(true);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        data: {
          role_name: roleName,
          permissions: selectedPermissions,
        },
      };

      if (editingRole) {
        // Edit Role
        await apiClient.put(`/role-definitions/${editingRole.id}`, payload);
      } else {
        // Add Role
        await apiClient.post('/role-definitions', payload);
      }

      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      console.error('Error saving role:', err);
      alert(err.response?.data?.error?.message || 'Error saving role configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom role definition? This will revoke access for any users assigned to this role.')) {
      return;
    }

    try {
      await apiClient.delete(`/role-definitions/${id}`);
      fetchRoles();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      alert(err.response?.data?.error?.message || 'Error deleting role definition.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Role Definitions</h1>
          <p className="text-sm text-slate-500">Configure customizable security roles and permissions for your staff.</p>
        </div>
        <Button 
          onClick={handleOpenAddModal}
          className="rounded-xl shadow-lg shadow-primary-600/10 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Custom Role
        </Button>
      </div>

      <div className="flex items-center gap-md max-w-md bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          className="flex-1 outline-none text-sm text-slate-700 bg-transparent"
          placeholder="Search roles by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <ShieldAlert className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading custom roles...</p>
        </div>
      ) : filteredRoles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <Card key={role.id} className="overflow-hidden border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-300">
              <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row justify-between items-center py-4 px-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary-500" />
                  <CardTitle className="text-lg font-bold text-slate-800">{role.role_name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-500 hover:text-primary-600 rounded-full"
                    onClick={() => handleOpenEditModal(role)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-500 hover:text-red-600 rounded-full"
                    onClick={() => handleDeleteRole(role.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Permissions</p>
                {role.permissions.length > 0 ? (
                  <div className="space-y-2">
                    {role.permissions.map((perm) => {
                      const detail = AVAILABLE_PERMISSIONS.find((p) => p.key === perm);
                      return (
                        <div key={perm} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="font-semibold">{detail ? detail.label : perm}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No permissions assigned to this role.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Shield className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-lg mb-1">No Custom Roles Found</p>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">Create customizable security levels for your employees to restrict workspace access.</p>
          <Button onClick={handleOpenAddModal} variant="outline">
            Create First Role
          </Button>
        </div>
      )}

      {/* Add / Edit Role Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? 'Edit Custom Role' : 'Add Custom Role'}
        size="lg"
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Role Name</label>
            <Input
              required
              placeholder="e.g. Finance Officer, Support Supervisor"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 block">Assign Permissions</label>
            <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.key);
                return (
                  <div 
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      isChecked 
                        ? 'border-primary-500 bg-primary-50/20' 
                        : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <button type="button" className="mt-0.5 text-primary-600 focus:outline-none">
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{perm.label}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{perm.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
