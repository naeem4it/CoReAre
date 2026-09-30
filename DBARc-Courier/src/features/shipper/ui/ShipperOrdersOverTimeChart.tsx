'use client';

import * as React from 'react';

export interface TimelineDataPoint {
  date: string; // e.g. "2026-09-01"
  label: string; // e.g. "1 Sept"
  count: number;
}

interface ShipperOrdersOverTimeChartProps {
  dailyData: TimelineDataPoint[];
  weeklyData?: TimelineDataPoint[];
}

export function ShipperOrdersOverTimeChart({ dailyData, weeklyData }: ShipperOrdersOverTimeChartProps) {
  const [mode, setMode] = React.useState<'Daily' | 'Weekly'>('Daily');
  const [hoveredPoint, setHoveredPoint] = React.useState<{ x: number; y: number; label: string; count: number } | null>(null);

  const activePoints = React.useMemo(() => {
    if (mode === 'Weekly' && weeklyData && weeklyData.length > 0) {
      return weeklyData;
    }
    return dailyData;
  }, [mode, dailyData, weeklyData]);

  // Compute scale boundaries
  const maxCount = React.useMemo(() => {
    const highest = Math.max(...activePoints.map(p => p.count), 0);
    if (highest <= 3) return 6;
    if (highest <= 6) return 9;
    if (highest <= 9) return 12;
    if (highest <= 12) return 12;
    return Math.ceil(highest / 3) * 3;
  }, [activePoints]);

  const yTicks = React.useMemo(() => {
    const step = maxCount / 4;
    return [maxCount, maxCount - step, maxCount - step * 2, maxCount - step * 3, 0];
  }, [maxCount]);

  // Chart Dimensions
  const width = 640;
  const height = 240;
  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const coords = React.useMemo(() => {
    if (activePoints.length === 0) return [];
    const stepX = activePoints.length > 1 ? chartWidth / (activePoints.length - 1) : chartWidth / 2;

    return activePoints.map((pt, index) => {
      const x = paddingLeft + (activePoints.length > 1 ? index * stepX : chartWidth / 2);
      const ratio = pt.count / maxCount;
      const y = paddingTop + chartHeight - ratio * chartHeight;
      return { x, y, label: pt.label, count: pt.count };
    });
  }, [activePoints, chartWidth, chartHeight, maxCount, paddingLeft, paddingTop]);

  // Generate smooth cubic bezier curve
  const pathD = React.useMemo(() => {
    if (coords.length === 0) return '';
    if (coords.length === 1) {
      return `M ${coords[0].x} ${coords[0].y}`;
    }

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[i + 1];
      const controlX1 = current.x + (next.x - current.x) / 2;
      const controlY1 = current.y;
      const controlX2 = current.x + (next.x - current.x) / 2;
      const controlY2 = next.y;
      d += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }
    return d;
  }, [coords]);

  // Generate area fill path
  const areaD = React.useMemo(() => {
    if (coords.length === 0) return '';
    const bottomY = paddingTop + chartHeight;
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pathD, coords, chartHeight, paddingTop]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-slate-800 tracking-tight">
          Orders over time
        </h3>

        {/* Daily / Weekly Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
          <button
            type="button"
            onClick={() => setMode('Daily')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === 'Daily'
                ? 'bg-white text-slate-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setMode('Weekly')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === 'Weekly'
                ? 'bg-white text-slate-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="splineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c4a42" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0c4a42" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines and Y-axis labels */}
          {yTicks.map((val, idx) => {
            const y = paddingTop + (idx / (yTicks.length - 1)) * chartHeight;
            return (
              <g key={idx}>
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-medium"
                >
                  {Math.round(val)}
                </text>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}

          {/* Area Fill */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#splineAreaGradient)"
            />
          )}

          {/* Smooth Curve Stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0c4a42"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {coords.map((pt, i) => {
            const isHovered = hoveredPoint?.label === pt.label;
            const hasData = pt.count > 0;
            return (
              <g key={i}>
                {hasData && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4.5 : 3}
                    fill="#0c4a42"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />
                )}
                {/* Invisible hover hotspot */}
                <rect
                  x={pt.x - 16}
                  y={paddingTop}
                  width="32"
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* X-axis label */}
                <text
                  x={pt.x}
                  y={paddingTop + chartHeight + 18}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-lg transform -translate-x-1/2 -translate-y-full -top-1 transition-all z-20"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div className="font-bold">{hoveredPoint.count} Orders</div>
            <div className="text-[9px] text-slate-300">{hoveredPoint.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}
