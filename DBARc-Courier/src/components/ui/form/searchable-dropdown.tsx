'use client';

import * as React from 'react';
import { useFormContext, Controller, FieldValues, Path } from 'react-hook-form';
import { FormLabel } from './form-primitives';
import { cn } from '@/shared/lib/utils';

export interface SearchableDropdownOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SearchableDropdownGroup {
  label: string;
  options: SearchableDropdownOption[];
}

export type DropdownItem = SearchableDropdownOption | SearchableDropdownGroup;

function isGroup(item: DropdownItem): item is SearchableDropdownGroup {
  return 'options' in item && Array.isArray(item.options);
}

export interface SearchableDropdownProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SearchableDropdown<TFieldValues extends FieldValues>({
  name,
  label,
  placeholder = 'Select an option...',
  items,
  required,
  optional,
  disabled,
  className = '',
  id,
}: SearchableDropdownProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectId = id || (name as string);

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Simple case-insensitive search filtering
  const filteredItems = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return items;

    return items
      .map((item) => {
        if (isGroup(item)) {
          const filteredOptions = item.options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(query) ||
              opt.value.toLowerCase().includes(query)
          );
          if (filteredOptions.length > 0) {
            return { ...item, options: filteredOptions };
          }
          return null;
        } else {
          const matches =
            item.label.toLowerCase().includes(query) ||
            item.value.toLowerCase().includes(query);
          return matches ? item : null;
        }
      })
      .filter((item): item is DropdownItem => item !== null);
  }, [items, searchQuery]);

  // Flat helper to find the display label of selected value
  const getSelectedLabel = (value: string) => {
    for (const item of items) {
      if (isGroup(item)) {
        const found = item.options.find((opt) => opt.value === value);
        if (found) return found.label;
      } else {
        if (item.value === value) return item.label;
      }
    }
    return '';
  };

  return (
    <div className="flex flex-col gap-xs w-full relative" ref={dropdownRef}>
      {label && (
        <FormLabel htmlFor={selectId} required={required} optional={optional}>
          {label}
        </FormLabel>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => {
          const errorMessage = error?.message;
          const displayLabel = value ? getSelectedLabel(value) : '';

          return (
            <div className="relative w-full">
              {/* Trigger Button */}
              <button
                id={selectId}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-invalid={errorMessage ? 'true' : 'false'}
                aria-describedby={errorMessage ? `${selectId}-error` : undefined}
                className={cn(
                  "w-full h-10 px-md bg-white border rounded-lg font-body-md text-body-md flex items-center justify-between text-on-surface text-left transition-all focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                  errorMessage
                    ? "border-error/50 focus:border-error focus:ring-error"
                    : "border-outline-variant focus:border-primary focus:ring-primary",
                  !value && "text-outline/60",
                  className
                )}
              >
                <span className="truncate">{displayLabel || placeholder}</span>
                <span className="material-symbols-outlined text-[20px] text-outline select-none transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                  keyboard_arrow_down
                </span>
              </button>

              {/* Dropdown Container */}
              {isOpen && (
                <div
                  className="absolute z-50 w-full mt-xs bg-white border border-outline-variant rounded-xl shadow-lg flex flex-col overflow-hidden max-h-[300px]"
                  role="listbox"
                >
                  {/* Search Header */}
                  <div className="p-2 border-b border-outline-variant bg-surface-container-lowest flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-outline select-none">
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search options..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline/50 h-8"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-outline hover:text-on-surface transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          close
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Listbox Options */}
                  <div className="overflow-y-auto flex-grow py-sm">
                    {filteredItems.length === 0 ? (
                      <div className="px-md py-sm font-body-md text-body-md text-outline italic text-center">
                        No results found
                      </div>
                    ) : (
                      filteredItems.map((item, idx) => {
                        if (isGroup(item)) {
                          return (
                            <div key={`group-${idx}`} className="space-y-xs">
                              <div className="px-md pt-sm pb-1 font-label-md text-label-md text-outline/70 uppercase tracking-widest select-none font-bold">
                                {item.label}
                              </div>
                              <div className="space-y-[1px]">
                                {item.options.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    disabled={opt.disabled}
                                    onClick={() => {
                                      onChange(opt.value);
                                      setIsOpen(false);
                                    }}
                                    className={cn(
                                      "w-full px-lg py-sm font-body-md text-body-md text-left flex items-center justify-between transition-colors cursor-pointer hover:bg-surface-container-low",
                                      value === opt.value
                                        ? "bg-primary-container text-on-primary-container font-semibold"
                                        : "text-on-surface-variant",
                                      opt.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                                    )}
                                  >
                                    <span>{opt.label}</span>
                                    {value === opt.value && (
                                      <span className="material-symbols-outlined text-[18px] text-primary select-none">
                                        check
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <button
                              key={item.value}
                              type="button"
                              disabled={item.disabled}
                              onClick={() => {
                                onChange(item.value);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "w-full px-md py-sm font-body-md text-body-md text-left flex items-center justify-between transition-colors cursor-pointer hover:bg-surface-container-low",
                                value === item.value
                                  ? "bg-primary-container/60 text-on-primary font-semibold"
                                  : "text-on-surface-variant",
                                item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                              )}
                            >
                              <span>{item.label}</span>
                              {value === item.value && (
                                <span className="material-symbols-outlined text-[18px] text-primary select-none">
                                  check
                                </span>
                              )}
                            </button>
                          );
                        }
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <span id={`${selectId}-error`} className="text-[12px] font-semibold text-error flex items-center gap-1 mt-0.5" role="alert">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errorMessage}
                </span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
