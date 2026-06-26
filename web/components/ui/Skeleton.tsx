"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--color-border)]",
        className
      )}
      {...props}
    />
  );
};

export { Skeleton };
