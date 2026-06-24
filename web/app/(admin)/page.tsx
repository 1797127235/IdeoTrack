"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboardStats, type DashboardStats } from "@/lib/reports";

function TrendChart() {
  const data = [65, 68, 72, 70, 75, 78, 82, 80, 85, 83, 87, 87];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 600;
  const height = 200;
  const padding = 24;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <div className="w-full h-52 relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#trendFill)"
          stroke="none"
          points={`${padding},${height - padding} ${points.join(" ")} ${width - padding},${height - padding}`}
        />
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - ((d - min) / range) * (height - padding * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6 text-xs text-[var(--color-ink-muted)]">
        {["6/13", "6/14", "6/15", "6/16", "6/17", "6/18", "6/19", "6/20", "6/21", "6/22", "6/23", "6/24"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function DistributionChart() {
  const data = [
    { label: "已完成", value: 65, color: "#2563eb" },
    { label: "进行中", value: 22, color: "#94a3b8" },
    { label: "未开始", value: 13, color: "#e2e8f0" },
  ];
  const total = data.reduce((a, b) => a + b.value, 0);
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center justify-center h-52">
      <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
        {data.map((d, i) => {
          const start = (cumulative / total) * 360;
          cumulative += d.value;
          const end = (cumulative / total) * 360;
          const largeArc = end - start > 180 ? 1 : 0;
          const x1 = 60 + 48 * Math.cos((Math.PI * start) / 180);
          const y1 = 60 + 48 * Math.sin((Math.PI * start) / 180);
          const x2 = 60 + 48 * Math.cos((Math.PI * end) / 180);
          const y2 = 60 + 48 * Math.sin((Math.PI * end) / 180);
          return (
            <path
              key={i}
              d={`M60 60 L${x1} ${y1} A48 48 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={d.color}
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}
        <circle cx="60" cy="60" r="28" fill="#fff" />
      </svg>
      <div className="mt-4 flex gap-4">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-[var(--color-ink-secondary)]">{d.label}</span>
            <span className="font-medium text-[var(--color-ink)]">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats()
      .then((data) => {
        setStats(data);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-[var(--color-ink-secondary)]">加载中…</div>;
  }

  if (error || !stats) {
    return (
      <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      label: "今日打卡率",
      value: `${stats.todayCheckInRate}%`,
      trend: `${stats.todayCheckInCount} / ${stats.todayTotalStudents}`,
      good: stats.todayCheckInRate >= 80,
    },
    {
      label: "今日打卡人数",
      value: String(stats.todayCheckInCount),
      trend: `未打卡 ${stats.todayAbsentCount}`,
      good: true,
    },
    {
      label: "未打卡人数",
      value: String(stats.todayAbsentCount),
      trend: "需重点关注",
      good: false,
    },
    {
      label: "累计心得数",
      value: String(stats.totalReflections),
      trend: `累计打卡 ${stats.totalCheckIns}`,
      good: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5"
          >
            <p className="text-sm text-[var(--color-ink-muted)] mb-2">{s.label}</p>
            <p className="text-2xl font-semibold text-[var(--color-ink)] mb-1">
              {s.value}
            </p>
            <p
              className={`text-xs ${
                s.good ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"
              }`}
            >
              {s.trend}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-4">
            近 12 天打卡趋势
          </h2>
          <TrendChart />
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-4">
            任务完成分布
          </h2>
          <DistributionChart />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              学院打卡排名
            </h2>
            <Link
              href="/reports"
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              查看全部
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                  排名
                </th>
                <th className="text-left py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                  学院
                </th>
                <th className="text-right py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                  打卡率
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.collegeRanking.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                >
                  <td className="py-3 text-sm font-medium text-[var(--color-ink)]">
                    {idx + 1 <= 3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                          idx + 1 === 1
                            ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]"
                            : idx + 1 === 2
                              ? "bg-slate-100 text-slate-500"
                              : "bg-orange-50 text-orange-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="text-[var(--color-ink-muted)] ml-1.5">
                        {idx + 1}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-[var(--color-ink)]">{r.name}</td>
                  <td className="py-3 text-sm text-right font-medium text-[var(--color-ink)]">
                    {r.rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              长期未打卡学生
            </h2>
            <Link
              href="/users"
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              查看全部
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                  姓名
                </th>
                <th className="text-left py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                  学院
                </th>
                <th className="text-right py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                  连续未打卡
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentAbsentStudents.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                >
                  <td className="py-3 text-sm text-[var(--color-ink)]">{s.name || s.schoolId}</td>
                  <td className="py-3 text-sm text-[var(--color-ink-secondary)]">
                    {s.collegeName || "-"}
                  </td>
                  <td className="py-3 text-sm text-right font-medium text-[var(--color-danger)]">
                    {s.consecutiveAbsentDays} 天
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
