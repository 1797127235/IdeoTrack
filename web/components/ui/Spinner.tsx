"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  size?: number;
}

const Spinner = ({ className, size = 20 }: SpinnerProps) => {
  return (
    <Loader2
      className={cn("animate-spin text-[var(--color-ink-muted)]", className)}
      size={size}
    />
  );
};

export { Spinner };
