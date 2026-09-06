'use client';

import * as React from 'react';
import { useFormContext, FieldValues, Path } from 'react-hook-form';
import { FormLabel } from './form-primitives';
import { cn } from '@/shared/lib/utils';

// ==========================================
// TextBox Component
// ==========================================
export interface TextBoxProps<TFieldValues extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: Path<TFieldValues>;
  label?: string;
  icon?: string;
  rightElement?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}

export function TextBox<TFieldValues extends FieldValues>({
  name,
  label,
  icon,
  rightElement,
  required,
  optional,
  className = '',
  disabled,
  id,
  ...props
}: TextBoxProps<TFieldValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;
  const inputId = id || (name as string);
  const cleanNumberLeadingZeros = (val: string): string => {
    if (!val) return val;
    // If string starts with 0 followed by digits 0-9 (not dot/decimal point):
    // e.g. "01" -> "1", "0340" -> "340", "00" -> "0"
    // But keeps "0.5", "0.05", "0", "0." untouched!
    if (/^0[0-9]+/.test(val)) {
      return val.replace(/^0+/, '') || '0';
    }
    return val;
  };

  const regProps = register(name, props.type === 'number' ? {
    setValueAs: (v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const str = typeof v === 'string' ? cleanNumberLeadingZeros(v) : v;
      return isNaN(Number(str)) ? str : Number(str);
    }
  } : undefined);

  return (
    <div className="flex flex-col gap-xs w-full">
      {label && (
        <FormLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FormLabel>
      )}
      <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors select-none" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={errorMessage ? 'true' : 'false'}
          aria-describedby={errorMessage ? `${inputId}-error` : undefined}
          className={cn(
            "w-full h-10 bg-white border rounded-lg font-body-md text-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface disabled:opacity-50 disabled:cursor-not-allowed",
            icon ? "pl-10" : "pl-4",
            rightElement ? "pr-12" : "pr-4",
            errorMessage 
              ? "border-error/50 focus:border-error focus:ring-1 focus:ring-error" 
              : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
            className
          )}
          {...regProps}
          {...props}
          onFocus={(e) => {
            if (props.type === 'number' && (e.target.value === '0' || e.target.value === '0.0')) {
              e.target.select();
            }
            props.onFocus?.(e);
          }}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            if (props.type === 'number') {
              const inputEl = e.currentTarget;
              const cleaned = cleanNumberLeadingZeros(inputEl.value);
              if (cleaned !== inputEl.value) {
                inputEl.value = cleaned;
              }
            }
            props.onInput?.(e as any);
          }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (props.type === 'number') {
              const cleaned = cleanNumberLeadingZeros(e.target.value);
              if (cleaned !== e.target.value) {
                e.target.value = cleaned;
              }
            }
            regProps.onChange(e);
            props.onChange?.(e);
          }}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {errorMessage && (
        <span id={`${inputId}-error`} className="text-[12px] font-semibold text-error flex items-center gap-1 mt-0.5" role="alert">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {errorMessage}
        </span>
      )}
    </div>
  );
}

// ==========================================
// SearchableInputText (Datalist Autocomplete) Component
// ==========================================
export interface SearchableInputTextProps<TFieldValues extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'list'> {
  name: Path<TFieldValues>;
  label?: string;
  icon?: string;
  rightElement?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  suggestions: string[];
}

export function SearchableInputText<TFieldValues extends FieldValues>({
  name,
  label,
  icon,
  rightElement,
  required,
  optional,
  suggestions,
  className = '',
  disabled,
  id,
  ...props
}: SearchableInputTextProps<TFieldValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;
  const inputId = id || (name as string);
  const datalistId = `${inputId}-datalist`;

  return (
    <div className="flex flex-col gap-xs w-full">
      {label && (
        <FormLabel htmlFor={inputId} required={required} optional={optional}>
          {label}
        </FormLabel>
      )}
      <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors select-none" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          list={datalistId}
          disabled={disabled}
          aria-invalid={errorMessage ? 'true' : 'false'}
          aria-describedby={errorMessage ? `${inputId}-error` : undefined}
          autoComplete="off"
          className={cn(
            "w-full h-10 bg-white border rounded-lg font-body-md text-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface disabled:opacity-50 disabled:cursor-not-allowed",
            icon ? "pl-10" : "pl-4",
            rightElement ? "pr-12" : "pr-4",
            errorMessage 
              ? "border-error/50 focus:border-error focus:ring-1 focus:ring-error" 
              : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
            className
          )}
          {...register(name, props.type === 'number' ? { valueAsNumber: true } : undefined)}
          {...props}
        />
        <datalist id={datalistId}>
          {suggestions.map((suggestion, index) => (
            <option key={`${suggestion}-${index}`} value={suggestion} />
          ))}
        </datalist>
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {errorMessage && (
        <span id={`${inputId}-error`} className="text-[12px] font-semibold text-error flex items-center gap-1 mt-0.5" role="alert">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {errorMessage}
        </span>
      )}
    </div>
  );
}
