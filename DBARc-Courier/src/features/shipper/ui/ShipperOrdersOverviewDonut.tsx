'use client';

import * as React from 'react';
import Link from 'next/link';

export interface OverviewSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
  statusQuery: string;
}

interface ShipperOrdersOverviewDonutProps {
  totalCount: number;
  slices: OverviewSlice[];
}

export function ShipperOrdersOverviewDonut({ totalCount, slices }: ShipperOrdersOverviewDonutProps) {
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null);

  // SVG parameters
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke dash offsets
  const computedSlices = React.useMemo(() => {
    let accumulated = 0;
    const items = [];
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const strokeLength = (slice.percentage / 100) * circumference;
      const strokeDashoffset = -((accumulated / 100) * circumference);
      accumulated += slice.percentage;
      items.push({
        ...slice,
        strokeLength,
        strokeDashoffset,
      });
    }
    return items;
  }, [slices, circumference]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs h-full flex flex-col justify-between">
      <h3 className="font-bold text-base text-slate-800 tracking-tight mb-2">
        Orders overview
      </h3>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto py-2">
        {/* Donut SVG */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 select-none overflow-visible"
          >
            {/* Background Track Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Colored Segments */}
            {totalCount > 0 && computedSlices.map((slice, idx) => {
              if (slice.percentage <= 0) return null;
              const isHovered = hoveredLabel === slice.label;

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredLabel(slice.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                />
              );
            })}
          </svg>

          {/* Centered Total Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {totalCount}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              TOTAL
            </span>
          </div>
        </div>

        {/* Legend on the right */}
        <div className="w-full sm:w-auto flex-1 space-y-3.5 pr-2">
          {slices.length === 0 ? (
            <p className="text-xs text-slate-400">No shipments found for this period</p>
          ) : (
            slices.map((slice, idx) => {
              const isHovered = hoveredLabel === slice.label;
              return (
                <Link
                  key={idx}
                  href={`/orders?status=${encodeURIComponent(slice.statusQuery)}`}
                  className={`flex items-center justify-between gap-3 text-xs group transition-all p-1 rounded-lg ${
                    isHovered ? 'bg-slate-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredLabel(slice.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-slate-600 font-medium group-hover:text-slate-900 truncate">
                      {slice.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-800">
                      {slice.count}
                    </span>
                    <span className="text-slate-400 text-[11px] font-medium w-8 text-right">
                      {slice.percentage}%
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
