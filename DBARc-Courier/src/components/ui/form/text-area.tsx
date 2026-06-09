'use client';

import * as React from 'react';
import { useFormContext, FieldValues, Path } from 'react-hook-form';
import { FormLabel } from './form-primitives';
import { cn } from '@/shared/lib/utils';

export interface TextAreaInputProps<TFieldValues extends FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: Path<TFieldValues>;
  label?: string;
  required?: boolean;
  optional?: boolean;
  autoGrow?: boolean;
}

export function TextAreaInput<TFieldValues extends FieldValues>({
  name,
  label,
  required,
  optional,
  autoGrow = true,
  className = '',
  disabled,
  id,
  rows = 3,
  ...props
}: TextAreaInputProps<TFieldValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;
  const areaId = id || (name as string);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const { ref: registerRef, onChange: registerOnChange, ...registerRest } = register(name);

  // Auto-grow function adjusts height based on scrollHeight
  const adjustHeight = React.useCallback(() => {
    if (!autoGrow) return;
    const element = textareaRef.current;
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
  }, [autoGrow]);

  // Adjust height on mount and whenever window resizes
  React.useEffect(() => {
    adjustHeight();
    if (autoGrow) {
      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }
  }, [adjustHeight, autoGrow]);

  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    registerOnChange(e);
    adjustHeight();
  };

  const setRefs = (element: HTMLTextAreaElement | null) => {
    textareaRef.current = element;
    registerRef(element);
  };

  return (
    <div className="flex flex-col gap-xs w-full">
      {label && (
        <FormLabel htmlFor={areaId} required={required} optional={optional}>
          {label}
        </FormLabel>
      )}
      <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
        <textarea
          id={areaId}
          disabled={disabled}
          rows={rows}
          aria-invalid={errorMessage ? 'true' : 'false'}
          aria-describedby={errorMessage ? `${areaId}-error` : undefined}
          ref={setRefs}
          onChange={handleOnChange}
          className={cn(
            "w-full bg-white border rounded-lg font-body-md text-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface disabled:opacity-50 disabled:cursor-not-allowed px-md py-sm resize-none overflow-y-hidden min-h-[80px]",
            errorMessage
              ? "border-error/50 focus:border-error focus:ring-1 focus:ring-error"
              : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary",
            className
          )}
          {...registerRest}
          {...props}
        />
      </div>
      {errorMessage && (
        <span id={`${areaId}-error`} className="text-[12px] font-semibold text-error flex items-center gap-1 mt-0.5" role="alert">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {errorMessage}
        </span>
      )}
    </div>
  );
}
