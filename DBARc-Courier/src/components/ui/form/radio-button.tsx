'use client';

import * as React from 'react';
import { useFormContext, FieldValues, Path } from 'react-hook-form';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioButtonProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  label?: string;
  options: RadioOption[];
  disabled?: boolean;
}

export function RadioButton<TFieldValues extends FieldValues>({
  name,
  label,
  options,
  disabled,
}: RadioButtonProps<TFieldValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;

  return (
    <div className="flex flex-col gap-xs w-full">
      {label && (
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-md py-1">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-xs cursor-pointer select-none font-body-md text-body-md text-on-surface-variant ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="radio"
              value={opt.value}
              disabled={disabled}
              className="w-4 h-4 text-primary border-outline focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
              {...register(name)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {errorMessage && (
        <span className="text-[12px] font-semibold text-error flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {errorMessage}
        </span>
      )}
    </div>
  );
}
