'use client';

import * as React from 'react';
import { TrackingSettingsForm } from '@/features/settings/ui/TrackingSettingsForm';

export default function MerchantSettingsPage() {
  return (
    <div className="p-6">
      <TrackingSettingsForm role="shipper" />
    </div>
  );
}
