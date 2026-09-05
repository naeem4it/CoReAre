'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function BookShipmentRedesignPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/shipments/book');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 text-primary border-4 border-solid border-current border-r-transparent rounded-full" role="status">
        <span className="sr-only">Redirecting to Book Shipment...</span>
      </div>
    </div>
  );
}
