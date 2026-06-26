"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchServerLogs,
  fetchAdminStatus,
  type AdminStatus,
  type HealthStatus,
} from "@/lib/admin";
import {
  Card,
  Button,
  Input,
  Select,
  EmptyState,
  Spinner,
} from "@/components/ui";
import {
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  Server,
  GitCommit,
  Package,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}分钟`);
  return parts.join(" ");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function HealthCard({ service }: { service: HealthStatus }) {
  const isHealthy = service.status === "healthy";
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            isHealthy
              ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
              : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
          }`}
        >
          {isHealthy ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--color-ink)]">
              {service.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isHealthy
                  ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
                  : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
              }`}
            >
              {isHealthy ? "正常" : "异常"}
            </span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            最近检查 {formatDateTime(service.lastCheckedAt)}
          </p>
          <p className="text-xs text-[var(--color-ink-secondary)] mt-1">
            响应 {service.responseTimeMs}ms
          </p>
          {service.message && (
            <p className="text-xs text-[var(--color-danger)] mt-1 truncate">
              {service.message}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function RuntimeCard({ runtime }: { runtime: AdminStatus["runtime"] }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-[var(--color-ink)] mb-4 flex items-center gap-2">
        <Server className="w-4 h-4 text-[var(--color-ink-muted)]" />
        运行时信息
      </h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-muted)]">版本</span>
          <span className="text-[var(--color-ink)] font-medium">
            {runtime.version}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-muted)]">Commit</span>
          <span className="text-[var(--color-ink)] font-mono text-xs">
            {runtime.commitHash.slice(0, 8)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-muted)]">镜像标签</span>
          <span className="text-[var(--color-ink)] font-mono text-xs">
            {runtime.imageTag}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-muted)]">启动时间</span>
          <span className="text-[var(--color-ink)]">
            {formatDateTime(runtime.startedAt)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-muted)]">运行时长</span>
          <span className="text-[var(--color-ink)]">
            {formatDuration(runtime.uptimeSeconds)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-muted)]">环境</span>
          <span className="text-[var(--color-ink)]">{runtime.nodeEnv}</span>
        </div>
      </div>
    </Card>
  );
}

function ErrorStatsCard({ errors }: { errors: AdminStatus["errors"] }) {
  const hasErrors = errors.totalErrors24h > 0;
  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-[var(--color-ink)] mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[var(--color-ink-muted)]" />
        最近 24 小时异常
      </h3>

      <div className="flex items-baseline gap-2 mb-5">
        <span
          className={`text-3xl font-bold ${
            hasErrors ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
          }`}
        >
          {errors.totalErrors24h}
        </span>
        <span className="text-sm text-[var(--color-ink-muted)]">次错误/警告</span>
      </div>

      {errors.topErrorEndpoints.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">
            高频报错接口 TOP5
          </h4>
          <div className="space-y-2">
            {errors.topErrorEndpoints.map((item, idx) => (
              <div key={item.path} className="flex items-center gap-2 text-sm">
                <span className="text-[var(--color-ink-muted)] w-4">{idx + 1}</span>
                <span className="flex-1 truncate text-[var(--color-ink)]">{item.path}</span>
                <span className="text-[var(--color-danger)] font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.levelDistribution.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">
            级别分布
          </h4>
          <div className="space-y-2">
            {errors.levelDistribution.map((item) => (
              <div key={item.level} className="flex items-center gap-2 text-sm">
                <span className="text-[var(--color-ink)] flex-1">{item.level}</span>
                <span className="text-[var(--color-ink-secondary)]">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OperationsPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  const [filter, setFilter] = useState("");
  const [level, setLevel] = useState("all");

  const loadAll = async () => {
    setStatusLoading(true);
    setLogsLoading(true);
    try {
      const [s, l] = await Promise.all([fetchAdminStatus(), fetchServerLogs()]);
      setStatus(s);
      setStatusError("");
      setLogs(l);
      setLogsError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "加载失败";
      setStatusError(msg);
      setLogsError(msg);
    } finally {
      setStatusLoading(false);
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      const matchesFilter = filter
        ? line.toLowerCase().includes(filter.toLowerCase())
        : true;
      const matchesLevel =
        level === "all"
          ? true
          : level === "error"
          ? line.includes('"level":50') || line.includes("ERROR") || line.includes('"status":5')
          : level === "warn"
          ? line.includes('"level":40') || line.includes("WARN")
          : level === "info"
          ? line.includes('"level":30') || line.includes("INFO")
          : true;
      return matchesFilter && matchesLevel;
    });
  }, [logs, filter, level]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">系统运维</h2>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            系统运行状况与运维管理中心
          </p>
        </div>
        <Button
          onClick={loadAll}
          size="sm"
          disabled={statusLoading}
          className="flex items-center gap-1.5"
        >
          <RotateCw className={`w-4 h-4 ${statusLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {statusLoading ? (
        <div className="py-12 flex items-center justify-center">
          <Spinner size={32} />
        </div>
      ) : statusError ? (
        <EmptyState title="加载失败" description={statusError} />
      ) : status ? (
        <>
          {/* Section 1: Service Health */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-ink)] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-accent)]" />
              服务健康状态
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {status.services.map((service) => (
                <HealthCard key={service.name} service={service} />
              ))}
            </div>
          </section>

          {/* Section 2 & 3: Runtime + Errors */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1">
              <RuntimeCard runtime={status.runtime} />
            </div>
            <div className="xl:col-span-2">
              <ErrorStatsCard errors={status.errors} />
            </div>
          </section>
        </>
      ) : null}

      {/* Section 4: Logs */}
      <section>
        <h3 className="text-sm font-medium text-[var(--color-ink)] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--color-accent)]" />
          服务器日志
        </h3>
        <Card className="p-5 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              placeholder="搜索日志内容"
              className="w-72"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Select
              className="w-40"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="all">全部级别</option>
              <option value="error">错误</option>
              <option value="warn">警告</option>
              <option value="info">信息</option>
            </Select>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          {logsLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner size={28} />
            </div>
          ) : logsError ? (
            <EmptyState title="加载失败" description={logsError} />
          ) : filteredLogs.length === 0 ? (
            <EmptyState title="暂无日志" description="当前筛选条件下没有匹配日志" />
          ) : (
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {filteredLogs.map((line, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                    >
                      <td className="py-2 px-4 text-[var(--color-ink-secondary)] whitespace-pre-wrap break-all">
                        {line}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
