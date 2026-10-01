'use client';

import * as React from 'react';

interface DBarcLogoProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark';
  showText?: boolean;
  subtitle?: string;
}

export const DBarcLogo: React.FC<DBarcLogoProps> = ({
  className = '',
  size = 40,
  variant = 'dark',
  showText = true,
  subtitle = 'Courier Manager',
}) => {
  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Aerodynamic Stylized Velocity 'D' Emblem Matching Option 1 */}
      <div 
        className="relative shrink-0 flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="dbarc-blue-crest" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#4F75FF" />
              <stop offset="60%" stopColor="#3B5BDB" />
              <stop offset="100%" stopColor="#2F49B8" />
            </linearGradient>
            <linearGradient id="dbarc-white-swoop" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isDark ? '#FFFFFF' : '#0284C7'} />
              <stop offset="100%" stopColor={isDark ? '#E0E7FF' : '#0369A1'} />
            </linearGradient>
          </defs>

          {/* Upper Dynamic Blue Crest (Upper Arch of D) */}
          <path
            d="M 18 24 
               H 42 
               C 68 24, 86 36, 86 54 
               C 86 64, 80 72, 70 78 
               C 76 70, 78 62, 78 54 
               C 78 42, 64 34, 44 34 
               H 28 
               L 18 42 
               Z"
            fill="url(#dbarc-blue-crest)"
          />

          {/* Lower Aerodynamic White Wing Swoop (Lower sweep & inner bowl) */}
          <path
            d="M 16 78 
               C 22 84, 34 86, 48 86 
               C 64 86, 76 78, 80 66 
               C 72 74, 60 76, 48 76 
               C 34 76, 26 70, 26 58 
               C 26 50, 32 44, 40 40 
               C 30 42, 22 50, 22 62 
               C 22 68, 18 72, 16 78 
               Z"
            fill="url(#dbarc-white-swoop)"
          />

          {/* Core Velocity Notch */}
          <path
            d="M 18 44 
               L 28 36 
               L 26 58 
               L 16 76 
               C 16 76, 18 54, 18 44 
               Z"
            fill="url(#dbarc-white-swoop)"
            opacity={isDark ? '0.95' : '1'}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-none select-none">
          <span 
            className={`font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
            style={{ fontSize: Math.max(16, size * 0.46) }}
          >
            DBARc
          </span>
          <span 
            className={`font-semibold tracking-wide mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            style={{ fontSize: Math.max(10, size * 0.26) }}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
