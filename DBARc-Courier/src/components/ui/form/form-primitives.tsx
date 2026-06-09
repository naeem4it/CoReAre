'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/utils';

// ==========================================
// FormLabel Primitive Component
// ==========================================
export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean | undefined;
  optional?: boolean | undefined;
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, optional, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "font-label-md text-label-md text-on-surface-variant uppercase tracking-wider flex items-center gap-xs select-none",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {required && (
          <span className="text-error font-bold text-headline-sm" aria-hidden="true" title="Required field">
            *
          </span>
        )}
        {optional && (
          <span className="text-outline/60 text-[10px] font-normal lowercase italic">
            (optional)
          </span>
        )}
      </label>
    );
  }
);
FormLabel.displayName = 'FormLabel';

// ==========================================
// FormButton Primitive Component
// ==========================================
export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  icon?: string;
}

export const FormButton = React.forwardRef<HTMLButtonElement, FormButtonProps>(
  ({ className, variant = 'primary', loading, icon, children, disabled, ...props }, ref) => {
    const baseStyles = "relative h-10 px-md rounded-lg font-body-md text-body-md font-semibold flex items-center justify-center gap-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    const variants = {
      primary: "bg-primary-container text-on-primary hover:bg-primary focus:ring-primary shadow-sm",
      secondary: "bg-surface-container-high text-on-surface hover:bg-surface-container-highest focus:ring-outline-variant",
      danger: "bg-error-container text-on-error-container hover:bg-error focus:ring-error shadow-sm",
      outline: "bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container-low focus:ring-outline-variant"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-current"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="sr-only">Processing...</span>
          </>
        ) : (
          <>
            {icon && (
              <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
          </>
        )}
        <span className={cn(loading ? "opacity-90" : "")}>{children}</span>
      </button>
    );
  }
);
FormButton.displayName = 'FormButton';

// ==========================================
// FormFieldSet Primitive Component
// ==========================================
export interface FormFieldSetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {}

export const FormFieldSet = React.forwardRef<HTMLFieldSetElement, FormFieldSetProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn(
          "border border-outline-variant/60 rounded-xl p-md space-y-md bg-surface-container-lowest/20",
          className
        )}
        {...props}
      >
        {children}
      </fieldset>
    );
  }
);
FormFieldSet.displayName = 'FormFieldSet';

// ==========================================
// FormLegend Primitive Component
// ==========================================
export interface FormLegendProps extends React.HTMLAttributes<HTMLLegendElement> {}

export const FormLegend = React.forwardRef<HTMLLegendElement, FormLegendProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <legend
        ref={ref}
        className={cn(
          "px-sm font-title-medium text-title-medium text-on-surface font-bold select-none",
          className
        )}
        {...props}
      >
        {children}
      </legend>
    );
  }
);
FormLegend.displayName = 'FormLegend';

// ==========================================
// FormOutput Primitive Component
// ==========================================
export interface FormOutputProps extends React.OutputHTMLAttributes<HTMLOutputElement> {}

export const FormOutput = React.forwardRef<HTMLOutputElement, FormOutputProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <output
        ref={ref}
        className={cn(
          "block min-h-10 px-md py-xs bg-surface-container-low text-on-surface-variant font-mono font-body-md text-body-md rounded-lg flex items-center justify-start border border-outline-variant/40",
          className
        )}
        {...props}
      >
        {children}
      </output>
    );
  }
);
FormOutput.displayName = 'FormOutput';
