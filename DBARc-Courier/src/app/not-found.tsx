'use client';

import * as React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[80vh] w-full flex items-center justify-center p-md bg-background text-on-surface">
      <div className="w-full max-w-[87%] bg-white dark:bg-surface-container-lowest rounded-2xl border border-outline-variant p-xl shadow-lg text-center flex flex-col items-center gap-md">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
            explore_off
          </span>
        </div>

        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface mb-xs font-bold">404</h1>
          <h2 className="font-headline-md text-headline-md text-on-surface-variant mb-sm">Page Not Found</h2>
          <p className="font-body-md text-body-md text-outline leading-relaxed mx-auto">
            The resource or cargo manifest route you are looking for does not exist or has been shifted to a different hub location.
          </p>
        </div>

        <div className="w-full h-px bg-outline-variant my-sm"></div>

        <div className="flex flex-col gap-sm w-full">
          <Link
            href="/"
            className="w-full h-10 bg-primary-container text-on-primary font-body-md text-body-md font-semibold rounded-lg flex items-center justify-center gap-xs hover:bg-primary transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Return to Terminal
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full h-10 bg-white border border-outline-variant text-secondary font-body-md text-body-md font-medium rounded-lg flex items-center justify-center gap-xs hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}
