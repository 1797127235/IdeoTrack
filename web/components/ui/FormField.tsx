"use client";

import { cn } from "@/lib/utils";
import { LabelHTMLAttributes, ReactNode } from "react";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}

const Label = ({
  children,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "block text-sm font-medium text-[var(--color-ink-secondary)] mb-1.5",
      className
    )}
    {...props}
  >
    {children}
  </label>
);

const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  required,
}: FormFieldProps) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="text-[var(--color-danger)] ml-0.5">*</span>
          )}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[var(--color-ink-muted)]">{hint}</p>
      )}
    </div>
  );
};

export { FormField, Label };
