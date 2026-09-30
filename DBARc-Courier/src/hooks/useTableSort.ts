'use client';

import * as React from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<TKey extends string = string> {
  column: TKey | null;
  direction: SortDirection;
}

export interface UseTableSortOptions<T, TKey extends string = string> {
  defaultColumn?: TKey;
  defaultDirection?: 'asc' | 'desc';
  customExtractors?: Partial<Record<TKey, (item: T) => unknown>>;
}

export function useTableSort<T, TKey extends string = string>(
  items: T[],
  options?: UseTableSortOptions<T, TKey>
) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig<TKey>>({
    column: options?.defaultColumn || null,
    direction: options?.defaultDirection || (options?.defaultColumn ? 'asc' : null),
  });

  const handleSort = React.useCallback((column: TKey) => {
    setSortConfig((prev) => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, []);

  const sortedItems = React.useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return items;
    }

    const { column, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;
    const extractor = options?.customExtractors?.[column];

    return [...items].sort((a, b) => {
      const valA = extractor ? extractor(a) : (a as Record<string, unknown>)[column];
      const valB = extractor ? extractor(b) : (b as Record<string, unknown>)[column];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      // Handle numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * factor;
      }

      // Try numeric parsing if numbers
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && typeof valA !== 'object' && typeof valB !== 'object') {
        return (numA - numB) * factor;
      }

      // Handle date strings
      if (typeof valA === 'string' && typeof valB === 'string') {
        const dateA = Date.parse(valA);
        const dateB = Date.parse(valB);
        if (!isNaN(dateA) && !isNaN(dateB) && valA.length > 5 && (valA.includes('-') || valA.includes('/') || valA.includes(':'))) {
          return (dateA - dateB) * factor;
        }
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return strA.localeCompare(strB) * factor;
    });
  }, [items, sortConfig, options?.customExtractors]);

  return {
    sortConfig,
    sortColumn: sortConfig.column,
    sortDirection: sortConfig.direction,
    handleSort,
    setSortConfig,
    sortedItems,
  };
}

export default useTableSort;
