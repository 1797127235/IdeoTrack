"use client";

import { useEffect, useState } from "react";
import { fetchAuditLogs, type AuditLog } from "@/lib/admin";
import { Card, Button, Spinner, EmptyState } from "@/components/ui";
import { Shield, RotateCw, CheckCircle2, XCircle } from "lucide-react";

type AuditTab = "login" | "login_failed" | "admin_action";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    login: "登录",
    login_failed: "登录失败",
    logout: "登出",
    create: "创建",
    update: "修改",
    delete: "删除",
    batch_import: "批量导入",
    export: "导出",
    backup: "备份",
    cleanup_exports: "清理导出文件",
    cleanup_temp: "清理临时文件",
  };
  return map[action] || action;
}

function categoryBadgeClass(category: string): string {
  switch (category) {
    case "auth":
      return "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]";
    case "user":
      return "bg-[var(--color-success-subtle)] text-[var(--color-success)]";
    case "task":
      return "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]";
    case "organization":
      return "bg-[var(--color-ink-muted)] text-[var(--color-surface)]";
    case "system":
      return "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]";
    default:
      return "bg-[var(--color-bg)] text-[var(--color-ink)]";
  }
}

export default function SecurityAudit() {
  const [tab, setTab] = useState<AuditTab>("login");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params =
        tab === "login"
          ? { action: "login" }
          : tab === "login_failed"
          ? { action: "login_failed" }
          : {};
      const data = await fetchAuditLogs({ ...params, limit: 50 });
      setLogs(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const tabs: { key: AuditTab; label: string }[] = [
    { key: "login", label: "最近登录记录" },
    { key: "login_failed", label: "失败登录尝试" },
    { key: "admin_action", label: "管理员敏感操作" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--color-ink)] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--color-ink-muted)]" />
          安全审计
        </h3>
        <Button onClick={load} size="sm" disabled={loading} className="flex items-center gap-1.5">
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-[var(--color-border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <EmptyState title="加载失败" description={error} />
      ) : logs.length === 0 ? (
        <EmptyState title="暂无记录" description="当前分类下没有审计日志" />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  时间
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  操作
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  管理员 / 账号
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  对象
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  IP 地址
                </th>
                <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  结果
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                >
                  <td className="py-3 text-[var(--color-ink-secondary)] whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeClass(
                        log.category
                      )}`}
                    >
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--color-ink)]">
                    {log.actor_name || log.actor_id || "-"}
                  </td>
                  <td className="py-3 text-[var(--color-ink-secondary)]">
                    {log.target_name || log.target_id || "-"}
                  </td>
                  <td className="py-3 text-[var(--color-ink-secondary)]">
                    {log.ip_address || "-"}
                  </td>
                  <td className="py-3">
                    {log.success ? (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        成功
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-danger)]">
                        <XCircle className="w-3.5 h-3.5" />
                        失败
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
