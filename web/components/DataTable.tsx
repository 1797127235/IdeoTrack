"use client";

import Link from "next/link";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  actions?: (row: T) => { label: string; href: string }[];
}

export default function DataTable<T>({ columns, rows, rowKey, actions }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]"
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="py-12 text-center text-sm text-[var(--color-ink-muted)]"
              >
                暂无数据
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="py-3.5 px-4 text-sm text-[var(--color-ink)]">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? "-")}
                  </td>
                ))}
                {actions && (
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {actions(row).map((action) => (
                        <Link
                          key={action.href}
                          href={action.href}
                          className="text-sm text-[var(--color-accent)] hover:underline"
                        >
                          {action.label}
                        </Link>
                      ))}
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
