"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "@/components/ui";

interface TrendPoint {
  date: string;
  checkInCount: number;
}

interface TrendChartProps {
  data: TrendPoint[];
}

function formatLabel(date: string) {
  const [, m, day] = date.split("-");
  return `${parseInt(m, 10)}/${parseInt(day, 10)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-sm">
        <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          {payload[0].value} 次打卡
        </p>
      </div>
    );
  }
  return null;
}

export default function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64">
        <EmptyState title="暂无趋势数据" description="当有近 12 天打卡数据时，图表将自动显示。" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: formatLabel(d.date),
    fullDate: d.date,
    count: d.checkInCount,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            fill="url(#colorCount)"
            dot={{ r: 3, fill: "var(--color-surface)", stroke: "var(--color-accent)", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "var(--color-accent)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
