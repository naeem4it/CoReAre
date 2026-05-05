'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useAuthStore } from '@/shared/model/auth.store';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl" hoverEffect>
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
            Welcome to DBARc
          </CardTitle>
          <p className="text-slate-500 mt-2">
            The future of multi-tenant logistics management.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Email Address" 
              placeholder="name@company.com" 
              defaultValue={user?.email}
            />
            <Input 
              label="Role" 
              disabled 
              defaultValue={user?.role || 'Guest'} 
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={() => setIsModalOpen(true)}>
              Open Test Modal
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh State
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="UI Component Library Test"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            This modal demonstrates the premium design tokens and smooth transitions.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
