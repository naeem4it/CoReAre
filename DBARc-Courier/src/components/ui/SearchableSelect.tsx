'use client';

import * as React from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string, option?: SearchableOption) => void;
  options: SearchableOption[];
  placeholder?: string;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  allOptionLabel,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const allItems: SearchableOption[] = React.useMemo(() => {
    if (allOptionLabel) {
      return [{ value: 'All', label: allOptionLabel }, ...options];
    }
    return options;
  }, [allOptionLabel, options]);

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.trim().toLowerCase();
    return allItems.filter(item => 
      item.label.toLowerCase().includes(q) ||
      (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
      item.value.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  const selectedItem = React.useMemo(() => {
    return allItems.find(i => i.value.toLowerCase() === (value || '').toLowerCase()) || null;
  }, [allItems, value]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-between transition-all outline-none text-left cursor-pointer focus:ring-2 focus:ring-primary/20 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed ${
          isOpen ? 'ring-2 ring-primary/20 border-primary' : ''
        }`}
      >
        <span className={`truncate ${selectedItem ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 min-w-[200px]">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              className="w-full text-xs outline-none bg-transparent placeholder-slate-400 font-medium"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.value.toLowerCase() === item.value.toLowerCase();
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value, item);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-between text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{item.label}</span>
                      {item.subLabel && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">{item.subLabel}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-center text-slate-400 font-medium">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
