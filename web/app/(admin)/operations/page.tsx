"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchServerLogs,
  fetchAdminStatus,
  fetchSystemResources,
  createDatabaseBackup,
  cleanupExports,
  cleanupTempFiles,
  type AdminStatus,
  type HealthStatus,
  type SystemResources,
  type BackupResult,
  type CleanupResult,
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
  Cpu,
  HardDrive,
  Database,
  FileText,
  Download,
  Trash2,
  Eraser,
  Stethoscope,
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function ProgressBar({ percent, colorClass }: { percent: number; colorClass?: string }) {
  const color =
    colorClass ||
    (percent >= 90
      ? "bg-[var(--color-danger)]"
      : percent >= 70
      ? "bg-[var(--color-warning)]"
      : "bg-[var(--color-success)]");
  return (
    <div className="h-2 w-full rounded-full bg-[var(--color-bg)] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
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

function ResourceCard({ resources }: { resources: SystemResources }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-[var(--color-ink)] mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-[var(--color-ink-muted)]" />
        系统资源
      </h3>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--color-ink)]">CPU 使用率</span>
            <span className="text-[var(--color-ink-secondary)]">{resources.cpu.usagePercent}%</span>
          </div>
          <ProgressBar percent={resources.cpu.usagePercent} />
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            负载 {resources.cpu.loadAverage.map((v) => v.toFixed(2)).join(" / ")} · {resources.cpu.cores} 核
          </p>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--color-ink)]">内存使用率</span>
            <span className="text-[var(--color-ink-secondary)]">
              {resources.memory.usagePercent}% · {formatBytes(resources.memory.usedBytes)} / {formatBytes(resources.memory.totalBytes)}
            </span>
          </div>
          <ProgressBar percent={resources.memory.usagePercent} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--color-ink)]">磁盘使用率</span>
            <span className="text-[var(--color-ink-secondary)]">
              {resources.disk.usagePercent}% · {formatBytes(resources.disk.usedBytes)} / {formatBytes(resources.disk.totalBytes)}
            </span>
          </div>
          <ProgressBar percent={resources.disk.usagePercent} />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink)] mb-2">
              <Database className="w-4 h-4 text-[var(--color-ink-muted)]" />
              数据库容量
            </div>
            <p className="text-lg font-semibold text-[var(--color-ink)]">
              {formatBytes(resources.database.databaseBytes)}
            </p>
            {resources.database.tables.length > 0 && (
              <div className="mt-2 space-y-1">
                {resources.database.tables.slice(0, 3).map((t) => (
                  <div key={t.name} className="flex justify-between text-xs">
                    <span className="text-[var(--color-ink-secondary)]">{t.name}</span>
                    <span className="text-[var(--color-ink-muted)]">{formatBytes(t.sizeBytes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink)] mb-2">
              <FileText className="w-4 h-4 text-[var(--color-ink-muted)]" />
              日志文件大小
            </div>
            <p className="text-lg font-semibold text-[var(--color-ink)]">
              {formatBytes(resources.log.appLogBytes)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ToolCard({
  title,
  description,
  icon: Icon,
  buttonText,
  onClick,
  loading,
  result,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  buttonText: string;
  onClick: () => void;
  loading: boolean;
  result?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-[var(--color-ink)]">{title}</h3>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">{description}</p>
          {result && (
            <p className="text-xs text-[var(--color-success)] mt-2">{result}</p>
          )}
          <Button
            onClick={onClick}
            size="sm"
            isLoading={loading}
            className="mt-3 flex items-center gap-1.5"
          >
            <Icon className="w-4 h-4" />
            {buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function OperationsPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [resources, setResources] = useState<SystemResources | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");

  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  const [filter, setFilter] = useState("");
  const [level, setLevel] = useState("all");

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState("");
  const [cleanupExportsLoading, setCleanupExportsLoading] = useState(false);
  const [cleanupExportsResult, setCleanupExportsResult] = useState("");
  const [cleanupTempLoading, setCleanupTempLoading] = useState(false);
  const [cleanupTempResult, setCleanupTempResult] = useState("");

  const loadAll = async () => {
    setStatusLoading(true);
    setResourcesLoading(true);
    setLogsLoading(true);
    try {
      const [s, r, l] = await Promise.all([
        fetchAdminStatus(),
        fetchSystemResources(),
        fetchServerLogs(),
      ]);
      setStatus(s);
      setStatusError("");
      setResources(r);
      setResourcesError("");
      setLogs(l);
      setLogsError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "加载失败";
      setStatusError(msg);
      setResourcesError(msg);
      setLogsError(msg);
    } finally {
      setStatusLoading(false);
      setResourcesLoading(false);
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await createDatabaseBackup();
      setBackupResult(`已备份 ${result.fileName} (${formatBytes(result.sizeBytes)})`);
    } catch (err) {
      setBackupResult(err instanceof Error ? err.message : "备份失败");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCleanupExports = async () => {
    setCleanupExportsLoading(true);
    try {
      const result = await cleanupExports();
      setCleanupExportsResult(
        `清理 ${result.deletedFiles.length} 个文件，释放 ${formatBytes(result.freedBytes)}`
      );
    } catch (err) {
      setCleanupExportsResult(err instanceof Error ? err.message : "清理失败");
    } finally {
      setCleanupExportsLoading(false);
    }
  };

  const handleCleanupTemp = async () => {
    setCleanupTempLoading(true);
    try {
      const result = await cleanupTempFiles();
      setCleanupTempResult(
        `清理 ${result.deletedFiles.length} 个文件，释放 ${formatBytes(result.freedBytes)}`
      );
    } catch (err) {
      setCleanupTempResult(err instanceof Error ? err.message : "清理失败");
    } finally {
      setCleanupTempLoading(false);
    }
  };

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

          {/* Section 2: Resources + Runtime + Errors */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1">
              <RuntimeCard runtime={status.runtime} />
            </div>
            <div className="xl:col-span-2">
              <ErrorStatsCard errors={status.errors} />
            </div>
          </section>

          {/* Section 3: System Resources */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-ink)] mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--color-accent)]" />
              系统资源
            </h3>
            {resourcesLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Spinner size={28} />
              </div>
            ) : resourcesError ? (
              <EmptyState title="加载失败" description={resourcesError} />
            ) : resources ? (
              <ResourceCard resources={resources} />
            ) : null}
          </section>

          {/* Section 4: Operation Tools */}
          <section>
            <h3 className="text-sm font-medium text-[var(--color-ink)] mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[var(--color-accent)]" />
              运维工具
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <ToolCard
                title="一键备份数据库"
                description="导出当前数据库到 exports/backups 目录"
                icon={Download}
                buttonText="立即备份"
                onClick={handleBackup}
                loading={backupLoading}
                result={backupResult}
              />
              <ToolCard
                title="清理过期导出文件"
                description="删除超过 7 天的导出文件"
                icon={Trash2}
                buttonText="立即清理"
                onClick={handleCleanupExports}
                loading={cleanupExportsLoading}
                result={cleanupExportsResult}
              />
              <ToolCard
                title="清理临时文件"
                description="清理人脸识别临时文件和缓存"
                icon={Eraser}
                buttonText="立即清理"
                onClick={handleCleanupTemp}
                loading={cleanupTempLoading}
                result={cleanupTempResult}
              />
            </div>
          </section>
        </>
      ) : null}

      {/* Section 5: Logs */}
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
