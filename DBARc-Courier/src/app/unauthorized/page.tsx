'use client';

import * as React from 'react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-[80vh] w-full flex items-center justify-center p-md bg-background text-on-surface">
      <div className="w-full max-w-[480px] bg-white dark:bg-surface-container-lowest rounded-2xl border border-outline-variant p-xl shadow-lg text-center flex flex-col items-center gap-md">
        <div className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
            gpp_bad
          </span>
        </div>
        
        <div>
          <h1 className="font-display-lg text-display-lg text-error mb-xs font-bold">401 / 403</h1>
          <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-sm">Access Forbidden</h2>
          <p className="font-body-md text-body-md text-outline leading-relaxed max-w-sm mx-auto">
            You do not possess the required clearance credentials or role definitions to access this Fly Courier terminal node.
          </p>
        </div>

        <div className="w-full h-px bg-outline-variant my-sm"></div>

        <div className="flex flex-col gap-sm w-full">
          <Link
            href="/login"
            className="w-full h-10 bg-primary-container text-on-primary font-body-md text-body-md font-semibold rounded-lg flex items-center justify-center gap-xs hover:bg-primary transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">vpn_key</span>
            Authenticate Again
          </Link>
          <Link
            href="/"
            className="w-full h-10 bg-white border border-outline-variant text-secondary font-body-md text-body-md font-medium rounded-lg flex items-center justify-center gap-xs hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
          >
            Return to Home Hub
          </Link>
        </div>
      </div>
    </main>
  );
}
