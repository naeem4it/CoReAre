'use client';

import * as React from 'react';
import Link from 'next/link';

export interface CityMetricItem {
  cityName: string;
  count: number;
  percentage: number;
}

interface ShipperTopCitiesProps {
  cities: CityMetricItem[];
}

export function ShipperTopCities({ cities }: ShipperTopCitiesProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs h-full flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-base text-slate-800 tracking-tight mb-4">
          Top cities
        </h3>

        <div className="space-y-4">
          {cities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No city records found for this period
            </div>
          ) : (
            cities.map((city, idx) => (
              <Link
                key={idx}
                href={`/merchant/orders?city=${encodeURIComponent(city.cityName)}`}
                className="block group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-800 group-hover:text-emerald-800 transition-colors">
                    {city.cityName}
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="text-slate-900 font-bold">{city.count}</span>
                    <span className="text-slate-400 font-medium text-[11px]">{city.percentage}%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#0c4a42] h-full rounded-full transition-all duration-500 ease-out group-hover:bg-emerald-700"
                    style={{ width: `${Math.min(city.percentage, 100)}%` }}
                  />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
