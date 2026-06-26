import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  UserCheck,
  TrendingUp,
  Award,
  Medal,
} from "lucide-react";
import { getDashboardStats, type DashboardStats } from "@/lib/server/reports";
import { ServerApiError } from "@/lib/server-api";
import { Card, StatCard, EmptyState, Button } from "@/components/ui";
import TrendChart from "@/components/TrendChart";

function DashboardContent({ stats }: { stats: DashboardStats }) {
  const statCards = [
    {
      title: "进行中任务",
      value: stats.activeTaskCount,
      trend: "当前可打卡的任务",
      icon: ClipboardList,
      iconColor: "blue" as const,
    },
    {
      title: "待完成人次",
      value: stats.pendingCompletionCount,
      trend: "活跃任务下尚未完成",
      icon: UserCheck,
      iconColor: "amber" as const,
    },
    {
      title: "今日新增打卡",
      value: stats.todayCheckInCount,
      trend: "今日有效打卡总数",
      icon: TrendingUp,
      iconColor: "green" as const,
    },
    {
      title: "累计完成打卡",
      value: stats.totalCompletedCount,
      trend: "AI 通过 + 人工通过",
      icon: Award,
      iconColor: "blue" as const,
    },
  ];

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {statCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Trend + Ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
        <Card className="p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-1">
            近 12 天打卡趋势
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            每日有效打卡数变化
          </p>
          <TrendChart data={stats.dailyCheckInTrend} />
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-1">
            学院完成率 Top 5
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)] mb-4">
            活跃任务下各学院完成情况
          </p>
          <CollegeRankingCompact ranking={stats.collegeRanking} />
        </Card>
      </div>

      {/* Full ranking */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              学院完成率排行
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              活跃任务下的学院排名
            </p>
          </div>
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  排名
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  学院
                </th>
                <th className="text-right py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  应打卡
                </th>
                <th className="text-right py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  已完成
                </th>
                <th className="text-right py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  完成率
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.collegeRanking.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="暂无活跃任务数据"
                      description="当有活跃任务产生打卡记录后，排行将自动更新。"
                    />
                  </td>
                </tr>
              ) : (
                stats.collegeRanking.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <td className="py-3 text-sm font-medium text-[var(--color-ink)]">
                      <RankBadge rank={idx + 1} />
                    </td>
                    <td className="py-3 text-sm text-[var(--color-ink)]">{r.name}</td>
                    <td className="py-3 text-sm text-right text-[var(--color-ink-secondary)]">
                      {r.totalAssignees}
                    </td>
                    <td className="py-3 text-sm text-right text-[var(--color-ink-secondary)]">
                      {r.completedCount}
                    </td>
                    <td className="py-3 text-sm text-right font-semibold text-[var(--color-ink)]">
                      {r.completionRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending students */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              当前任务未完成学生
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              需要督促打卡的学生列表
            </p>
          </div>
          <Link href="/users">
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[36rem]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  姓名
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  学院
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  未完成任务
                </th>
                <th className="text-right py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  截止时间
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.pendingStudents.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      title="暂无未完成学生"
                      description="所有学生均已完成当前任务。"
                    />
                  </td>
                </tr>
              ) : (
                stats.pendingStudents.map((s) => (
                  <tr
                    key={`${s.id}-${s.taskId}`}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <td className="py-3 text-sm text-[var(--color-ink)]">
                      {s.name || s.schoolId}
                    </td>
                    <td className="py-3 text-sm text-[var(--color-ink-secondary)]">
                      {s.collegeName || "-"}
                    </td>
                    <td className="py-3 text-sm text-[var(--color-ink-secondary)]">
                      {s.taskTitle}
                    </td>
                    <td className="py-3 text-sm text-right font-medium text-[var(--color-danger)]">
                      {formatDateTime(s.taskDeadline)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-warning-subtle)] text-[var(--color-warning)] text-xs font-bold">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-bg)] text-[var(--color-ink-muted)] text-xs font-bold">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] text-xs font-bold">
        3
      </span>
    );
  }
  return <span className="text-[var(--color-ink-muted)] text-sm ml-1.5">{rank}</span>;
}

function CollegeRankingCompact({
  ranking,
}: {
  ranking: DashboardStats["collegeRanking"];
}) {
  const top = ranking.slice(0, 5);
  if (top.length === 0) {
    return (
      <EmptyState
        title="暂无数据"
        description="活跃任务数据更新后将显示前 5 名学院。"
      />
    );
  }

  const max = Math.max(...top.map((r) => r.completionRate), 1);

  return (
    <div className="space-y-4">
      {top.map((r, idx) => {
        const pct = max === 0 ? 0 : (r.completionRate / max) * 100;
        return (
          <div key={r.id} className="flex items-center gap-3">
            <div className="shrink-0 w-5 text-center">
              {idx === 0 ? (
                <Medal className="w-5 h-5 text-[var(--color-warning)]" />
              ) : (
                <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
                  {idx + 1}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-[var(--color-ink)] truncate">
                  {r.name}
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink)] ml-2">
                  {r.completionRate}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      <EmptyState
        title="加载失败"
        description={err instanceof Error ? err.message : "无法获取 Dashboard 数据"}
      />
    );
  }

  return <DashboardContent stats={stats} />;
}
