"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card };
