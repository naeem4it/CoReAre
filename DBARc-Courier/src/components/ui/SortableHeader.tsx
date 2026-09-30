'use client';

import * as React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '@/hooks/useTableSort';

export interface SortableHeaderProps {
  label: React.ReactNode;
  column?: string;
  columnKey?: string;
  activeColumn?: string | null;
  currentColumn?: string | null;
  direction?: SortDirection;
  currentDirection?: SortDirection;
  onSort: (column: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableHeader({
  label,
  column,
  columnKey,
  activeColumn,
  currentColumn,
  direction,
  currentDirection,
  onSort,
  className = '',
  align = 'left',
}: SortableHeaderProps) {
  const col = (column || columnKey || '') as string;
  const activeCol = activeColumn !== undefined ? activeColumn : currentColumn;
  const dir = direction !== undefined ? direction : currentDirection;
  const isActive = activeCol === col;

  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={`group inline-flex items-center gap-1.5 font-bold uppercase tracking-wider transition-colors select-none cursor-pointer hover:text-primary ${
        isActive ? 'text-primary' : 'text-inherit'
      } ${align === 'right' ? 'flex-row-reverse ml-auto' : align === 'center' ? 'justify-center mx-auto' : ''} ${className}`}
      title={`Sort by ${typeof label === 'string' ? label : col}`}
    >
      <span>{label}</span>
      <span className="inline-flex items-center transition-transform">
        {isActive && dir === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-150" />
        ) : isActive && dir === 'desc' ? (
          <ArrowDown className="w-3.5 h-3.5 text-primary animate-in fade-in zoom-in-75 duration-150" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
        )}
      </span>
    </button>
  );
}

export default SortableHeader;
