import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardStats, type DashboardStats } from "@/lib/server/reports";
import { ServerApiError } from "@/lib/server-api";

const TREND_WIDTH = 600;
const TREND_HEIGHT = 200;
const TREND_PADDING = 24;

// 近 12 天每日有效打卡数折线图（真实数据）
function TrendChart({ trend }: { trend: DashboardStats["dailyCheckInTrend"] }) {
  if (trend.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-[var(--color-ink-muted)]">
        暂无数据
      </div>
    );
  }

  const data = trend.map((d) => d.checkInCount);
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = TREND_PADDING + (i / (data.length - 1)) * (TREND_WIDTH - TREND_PADDING * 2);
    const y = TREND_HEIGHT - TREND_PADDING - ((d - min) / range) * (TREND_HEIGHT - TREND_PADDING * 2);
    return `${x},${y}`;
  });

  return (
    <div className="w-full h-52 relative">
      <svg viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`} className="w-full h-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#trendFill)"
          stroke="none"
          points={`${TREND_PADDING},${TREND_HEIGHT - TREND_PADDING} ${points.join(" ")} ${TREND_WIDTH - TREND_PADDING},${TREND_HEIGHT - TREND_PADDING}`}
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
          const x = TREND_PADDING + (i / (data.length - 1)) * (TREND_WIDTH - TREND_PADDING * 2);
          const y = TREND_HEIGHT - TREND_PADDING - ((d - min) / range) * (TREND_HEIGHT - TREND_PADDING * 2);
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
        {trend.map((d) => {
          // 'YYYY-MM-DD' -> 'M/D'
          const [, m, day] = d.date.split("-");
          return (
            <span key={d.date}>{`${parseInt(m, 10)}/${parseInt(day, 10)}`}</span>
          );
        })}
      </div>
    </div>
  );
}

function DashboardContent({ stats }: { stats: DashboardStats }) {
  const statCards = [
    {
      label: "进行中任务",
      value: String(stats.activeTaskCount),
      trend: "当前可打卡的任务",
      good: true,
    },
    {
      label: "待完成人次",
      value: String(stats.pendingCompletionCount),
      trend: "活跃任务下尚未完成",
      good: stats.pendingCompletionCount === 0,
    },
    {
      label: "今日新增打卡",
      value: String(stats.todayCheckInCount),
      trend: "今日有效打卡总数",
      good: true,
    },
    {
      label: "累计完成打卡",
      value: String(stats.totalCompletedCount),
      trend: "AI 通过 + 人工通过",
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
          <TrendChart trend={stats.dailyCheckInTrend} />
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-4">
            学院完成率 Top 5
          </h2>
          <CollegeRankingCompact ranking={stats.collegeRanking} />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            学院完成率排行（活跃任务）
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
                应打卡
              </th>
              <th className="text-right py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                已完成
              </th>
              <th className="text-right py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                完成率
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.collegeRanking.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-[var(--color-ink-secondary)]">
                  暂无活跃任务数据
                </td>
              </tr>
            ) : (
              stats.collegeRanking.map((r, idx) => (
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
                  <td className="py-3 text-sm text-right text-[var(--color-ink-secondary)]">
                    {r.totalAssignees}
                  </td>
                  <td className="py-3 text-sm text-right text-[var(--color-ink-secondary)]">
                    {r.completedCount}
                  </td>
                  <td className="py-3 text-sm text-right font-medium text-[var(--color-ink)]">
                    {r.completionRate}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
            当前任务未完成学生
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
              <th className="text-left py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                未完成任务
              </th>
              <th className="text-right py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)]">
                截止时间
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.pendingStudents.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-[var(--color-ink-secondary)]">
                  暂无未完成学生
                </td>
              </tr>
            ) : (
              stats.pendingStudents.map((s) => (
                <tr
                  key={`${s.id}-${s.taskId}`}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                >
                  <td className="py-3 text-sm text-[var(--color-ink)]">{s.name || s.schoolId}</td>
                  <td className="py-3 text-sm text-[var(--color-ink-secondary)]">
                    {s.collegeName || "-"}
                  </td>
                  <td className="py-3 text-sm text-[var(--color-ink-secondary)]">{s.taskTitle}</td>
                  <td className="py-3 text-sm text-right font-medium text-[var(--color-danger)]">
                    {formatDateTime(s.taskDeadline)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 右侧紧凑型 Top 5 列表（仅完成率柱状对比）
function CollegeRankingCompact({ ranking }: { ranking: DashboardStats["collegeRanking"] }) {
  const top = ranking.slice(0, 5);
  if (top.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[var(--color-ink-muted)]">
        暂无数据
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {top.map((r, idx) => (
        <div key={r.id} className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-ink-muted)] w-4">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[var(--color-ink)] truncate">{r.name}</span>
              <span className="text-sm font-medium text-[var(--color-ink)] ml-2">
                {r.completionRate}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${Math.min(100, r.completionRate)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function DashboardPage() {
  let stats: DashboardStats;
  try {
    stats = await getDashboardStats();
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 401) {
      redirect("/login");
    }
    return (
      <div className="px-4 py-3 rounded-lg bg-[var(--color-danger-subtle)] text-sm text-[var(--color-danger)]">
        {err instanceof Error ? err.message : "加载失败"}
      </div>
    );
  }

  return <DashboardContent stats={stats} />;
}
