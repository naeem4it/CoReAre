'use client';

import * as React from 'react';
import { TrackingSettingsForm } from '@/features/settings/ui/TrackingSettingsForm';

export default function AdminSettingsPage() {
  return (
    <div className="p-6">
      <TrackingSettingsForm role="admin" />
    </div>
  );
}
