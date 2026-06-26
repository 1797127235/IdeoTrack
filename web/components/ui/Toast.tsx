"use client";

import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success-subtle)]",
  error: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger-subtle)]",
  info: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent-subtle)]",
};

const Toast = ({ toast, onDismiss }: ToastProps) => {
  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm min-w-[16rem]",
        styles[toast.type]
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
        aria-label="关闭通知"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export { Toast };
