'use client';

import * as React from 'react';
import { ApiError } from '@/types/strapi.types';

interface ErrorProps {
  error: Error & { digest?: string; apiError?: ApiError };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error('Terminal runtime fault caught by boundary:', error);
  }, [error]);

  const apiDetail = error.apiError;

  return (
    <main className="min-h-[80vh] w-full flex items-center justify-center p-md bg-background text-on-surface">
      <div className="w-full max-w-[520px] bg-white dark:bg-surface-container-lowest rounded-2xl border border-error-container p-xl shadow-lg flex flex-col gap-md">
        {/* Header Alert */}
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">error</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-error font-bold">Terminal Runtime Failure</h1>
            <p className="font-body-md text-body-md text-outline">An unexpected system breakdown occurred.</p>
          </div>
        </div>

        <div className="w-full h-px bg-outline-variant"></div>

        {/* Technical Details */}
        <div className="bg-surface-container-low rounded-xl p-md border border-outline-variant/60 font-mono text-[13px] text-on-surface-variant break-words">
          <p className="font-semibold text-error mb-1">
            {error.name || 'SystemError'}: {error.message || 'An unknown fault interrupted execution.'}
          </p>
          {error.digest && (
            <p className="text-[11px] text-outline mt-1">
              Digest: {error.digest}
            </p>
          )}
          {apiDetail && (
            <div className="mt-sm pt-sm border-t border-outline-variant/50 text-[12px]">
              <p className="font-semibold text-primary">API Response Error ({apiDetail.status}):</p>
              <p>{apiDetail.message}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-sm mt-sm">
          <button
            onClick={() => reset()}
            className="flex-1 h-10 bg-primary-container text-on-primary font-body-md text-body-md font-semibold rounded-lg flex items-center justify-center gap-xs hover:bg-primary transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Reset Terminal Session
          </button>
          <button
            onClick={() => window.location.assign('/')}
            className="flex-1 h-10 bg-white border border-outline-variant text-secondary font-body-md text-body-md font-medium rounded-lg flex items-center justify-center gap-xs hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
