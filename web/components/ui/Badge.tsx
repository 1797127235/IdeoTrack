"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "neutral" | "info";
}

const Badge = ({ className, variant = "neutral", children, ...props }: BadgeProps) => {
  const variants = {
    success:
      "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
    warning:
      "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
    danger: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
    info: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]",
    neutral: "bg-[var(--color-bg)] text-[var(--color-ink-secondary)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
