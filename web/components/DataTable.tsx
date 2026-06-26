"use client";

import { EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  actions?: (row: T) => React.ReactNode;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonRows?: number;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  isLoading = false,
  emptyTitle = "暂无数据",
  emptyDescription,
  skeletonRows = 5,
  className,
}: DataTableProps<T>) {
  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[32rem]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  "text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton colCount={colCount} rows={skeletonRows} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="py-2">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      "py-3.5 px-4 text-sm text-[var(--color-ink)]",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String(
                          (row as Record<string, unknown>)[col.key as string] ??
                            "-"
                        )}
                  </td>
                ))}
                {actions && (
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton({
  colCount,
  rows,
}: {
  colCount: number;
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
          {Array.from({ length: colCount }).map((__, j) => (
            <td key={j} className="py-3.5 px-4">
              <Skeleton className="h-4 w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
