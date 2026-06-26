"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

const EmptyState = ({
  title = "暂无数据",
  description,
  icon = <Inbox className="w-6 h-6 text-[var(--color-ink-muted)]" />,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--color-bg)] flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-[var(--color-ink-secondary)]">
        {title}
      </p>
      {description && (
        <p className="text-xs text-[var(--color-ink-muted)] mt-1 max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
};

export { EmptyState };
