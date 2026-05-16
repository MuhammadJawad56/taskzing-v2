import React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-theme-primaryText dark:text-white mb-1"
          >
            {label}
            {props.required && <span className="text-accent-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-lg border border-black bg-theme-primaryBackground px-3 py-2 text-sm text-theme-primaryText dark:border-gray-600 dark:bg-darkBlue-013 dark:text-white",
            "ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-theme-accent4 dark:placeholder:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-accent-error focus-visible:ring-accent-error",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-accent-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-theme-accent4">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

