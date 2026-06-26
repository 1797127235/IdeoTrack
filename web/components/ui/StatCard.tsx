"use client";

import { Card } from "./Card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: "blue" | "green" | "amber" | "red";
}

const StatCard = ({
  title,
  value,
  trend,
  trendDirection = "neutral",
  icon: Icon,
  iconColor = "blue",
}: StatCardProps) => {
  const colorMap = {
    blue: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]",
    green: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
    amber: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
    red: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
  };

  const trendColor = {
    up: "text-[var(--color-success)]",
    down: "text-[var(--color-danger)]",
    neutral: "text-[var(--color-ink-muted)]",
  };

  return (
    <Card className="p-5 flex items-start gap-4">
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          colorMap[iconColor]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--color-ink-muted)] truncate">{title}</p>
        <p className="text-2xl font-semibold text-[var(--color-ink)] mt-1">{value}</p>
        {trend && (
          <p className={cn("text-xs mt-1", trendColor[trendDirection])}>{trend}</p>
        )}
      </div>
    </Card>
  );
};

export { StatCard };
