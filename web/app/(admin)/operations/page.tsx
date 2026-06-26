"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
import { Card, Button, Input, Select, EmptyState, Spinner } from "@/components/ui";
import SecurityAudit from "./SecurityAudit";
import {
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  Server,
  Database,
  HardDrive,
  FileText,
  AlertTriangle,
  RotateCw,
  Cpu,
  Download,
  Trash2,
  Eraser,
  Stethoscope,
  Shield,
  Layers,
  Zap,
} from "lucide-react";

const COLORS = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  accent: "#2563eb",
  info: "#3b82f6",
  muted: "#94a3b8",
};

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
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

function SectionHeader({
  number,
  title,
  icon: Icon,
}: {
  number: number;
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">
        {number}
      </span>
      <Icon className="w-4 h-4 text-[var(--color-accent)]" />
      <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
    </div>
  );
}

function ProgressBar({ percent, color = COLORS.success }: { percent: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-[var(--color-bg)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function HealthCard({ service }: { service: HealthStatus }) {
  const isHealthy = service.status === "healthy";
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
            isHealthy ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
          }`}
        >
          {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[var(--color-ink)]">{service.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isHealthy ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}
            >
              {isHealthy ? "正常" : "异常"}
            </span>
          </div>
          <div className="text-xs text-[var(--color-ink-muted)] space-y-0.5">
            <p>最近检查 {formatDateTime(service.lastCheckedAt)}</p>
            <p>响应 {service.responseTimeMs}ms</p>
          </div>
          {service.message && (
            <p className="text-xs text-red-500 mt-1 truncate">{service.message}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-ink-muted)]">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--color-ink-muted)] mb-0.5">{title}</p>
          <p className="text-lg font-bold text-[var(--color-ink)] truncate">{value}</p>
          {subtitle && <p className="text-xs text-[var(--color-ink-secondary)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

function ResourceSection({ resources }: { resources: SystemResources }) {
  const cpuColor =
    resources.cpu.usagePercent >= 80 ? COLORS.danger : resources.cpu.usagePercent >= 60 ? COLORS.warning : COLORS.success;
  const memColor =
    resources.memory.usagePercent >= 80 ? COLORS.danger : resources.memory.usagePercent >= 60 ? COLORS.warning : COLORS.success;
  const diskColor =
    resources.disk.usagePercent >= 80 ? COLORS.danger : resources.disk.usagePercent >= 60 ? COLORS.warning : COLORS.success;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="p-5 xl:col-span-2">
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[var(--color-ink)]">CPU 使用率</span>
              <span className="text-sm font-bold text-[var(--color-ink)]">{resources.cpu.usagePercent}%</span>
            </div>
            <ProgressBar percent={resources.cpu.usagePercent} color={cpuColor} />
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">
              负载 {resources.cpu.loadAverage.map((v) => v.toFixed(2)).join(" / ")} · {resources.cpu.cores} 核
            </p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[var(--color-ink)]">内存使用率</span>
              <span className="text-sm font-bold text-[var(--color-ink)]">
                {resources.memory.usagePercent}% · {formatBytes(resources.memory.usedBytes)} / {formatBytes(resources.memory.totalBytes)}
              </span>
            </div>
            <ProgressBar percent={resources.memory.usagePercent} color={memColor} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[var(--color-ink)]">磁盘使用率</span>
              <span className="text-sm font-bold text-[var(--color-ink)]">
                {resources.disk.usagePercent}% · {formatBytes(resources.disk.usedBytes)} / {formatBytes(resources.disk.totalBytes)}
              </span>
            </div>
            <ProgressBar percent={resources.disk.usagePercent} color={diskColor} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <MetricCard
          icon={Database}
          title="数据库容量"
          value={formatBytes(resources.database.databaseBytes)}
          subtitle={`TOP 3 表: ${resources.database.tables.slice(0, 3).map((t) => t.name).join(", ")}`}
        />
        <MetricCard icon={FileText} title="日志文件大小" value={formatBytes(resources.log.appLogBytes)} />
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-muted)] mb-2">表大小 TOP 3</p>
          <div className="space-y-2">
            {resources.database.tables.slice(0, 3).map((t) => (
              <div key={t.name} className="flex justify-between text-sm">
                <span className="text-[var(--color-ink)] truncate">{t.name}</span>
                <span className="text-[var(--color-ink-secondary)]">{formatBytes(t.sizeBytes)}</span>
              </div>
            ))}
            {resources.database.tables.length === 0 && (
              <p className="text-xs text-[var(--color-ink-muted)]">暂无数据</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ErrorSection({ errors }: { errors: AdminStatus["errors"] }) {
  const topData = errors.topErrorEndpoints.map((item) => ({
    name: item.path.length > 24 ? item.path.slice(0, 24) + "..." : item.path,
    full: item.path,
    count: item.count,
  }));

  const pieData = errors.levelDistribution.map((item) => ({
    name: item.level,
    value: item.count,
  }));

  const pieColors = [COLORS.danger, COLORS.warning, COLORS.info, COLORS.muted];

  const alerts = useMemo(() => {
    const list: Array<{ message: string; level: "error" | "warn" | "info"; time: string }> = [];
    if (errors.totalErrors24h > 0) {
      list.push({
        message: `最近 24 小时出现 ${errors.totalErrors24h} 次错误/警告`,
        level: "error",
        time: formatDateTime(new Date().toISOString()),
      });
    }
    errors.topErrorEndpoints.slice(0, 2).forEach((item) => {
      list.push({
        message: `接口 ${item.path} 报错 ${item.count} 次`,
        level: "warn",
        time: formatDateTime(new Date().toISOString()),
      });
    });
    if (list.length === 0) {
      list.push({
        message: "最近 24 小时系统运行平稳",
        level: "info",
        time: formatDateTime(new Date().toISOString()),
      });
    }
    return list;
  }, [errors]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="p-5 flex flex-col items-center justify-center">
        <p className="text-xs text-[var(--color-ink-muted)] mb-2">最近 24 小时错误数</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-5xl font-bold ${errors.totalErrors24h > 0 ? "text-[var(--color-danger)]" : "text-green-500"}`}>
            {errors.totalErrors24h}
          </span>
          <span className="text-sm text-[var(--color-ink-muted)]">次</span>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] mt-2">较昨日 --</p>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium text-[var(--color-ink)] mb-3">高频报错接口 TOP5</p>
        <div className="h-48">
          {topData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 11, fill: "var(--color-ink-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                  formatter={(value) => [value ?? 0, "次数"]}
                />
                <Bar dataKey="count" fill={COLORS.danger} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--color-ink-muted)]">
              暂无报错接口
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium text-[var(--color-ink)] mb-1">错误级别分布</p>
        <div className="h-40">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--color-ink-muted)]">
              暂无分布数据
            </div>
          )}
        </div>
        <div className="space-y-1 mt-2">
          {pieData.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                />
                <span className="text-[var(--color-ink)]">{entry.name}</span>
              </div>
              <span className="text-[var(--color-ink-muted)]">
                {entry.value} ({Math.round((entry.value / (errors.totalErrors24h || 1)) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
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
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-lg bg-blue-50 text-[var(--color-accent)] flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-[var(--color-ink)]">{title}</h4>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1 leading-relaxed">{description}</p>
          {result && <p className="text-xs text-green-600 mt-2">{result}</p>}
          <Button onClick={onClick} size="sm" isLoading={loading} className="mt-3">
            {buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RuntimeSection({ runtime }: { runtime: AdminStatus["runtime"] }) {
  const items = [
    { icon: Layers, label: "当前部署版本", value: runtime.version },
    { icon: Server, label: "Commit Hash", value: runtime.commitHash.slice(0, 8) },
    { icon: Zap, label: "镜像标签", value: runtime.imageTag },
    { icon: Clock, label: "服务启动时间", value: formatDateTime(runtime.startedAt) },
    { icon: Activity, label: "运行时长", value: formatDuration(runtime.uptimeSeconds) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-ink-muted)]">
              <item.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-ink-muted)]">{item.label}</p>
              <p className="text-sm font-medium text-[var(--color-ink)] truncate">{item.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
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
      const [s, r, l] = await Promise.all([fetchAdminStatus(), fetchSystemResources(), fetchServerLogs()]);
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
      setCleanupExportsResult(`清理 ${result.deletedFiles.length} 个文件，释放 ${formatBytes(result.freedBytes)}`);
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
      setCleanupTempResult(`清理 ${result.deletedFiles.length} 个文件，释放 ${formatBytes(result.freedBytes)}`);
    } catch (err) {
      setCleanupTempResult(err instanceof Error ? err.message : "清理失败");
    } finally {
      setCleanupTempLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      const matchesFilter = filter ? line.toLowerCase().includes(filter.toLowerCase()) : true;
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

  if (statusLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  if (statusError || !status) {
    return <EmptyState title="加载失败" description={statusError || "无法获取系统状态"} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-ink)]">系统运维</h2>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">系统运行状况与运维管理中心</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-ink-muted)]">
            数据更新时间：{formatDateTime(status.updatedAt)}
          </span>
          <Button onClick={loadAll} size="sm" disabled={statusLoading} className="flex items-center gap-1.5">
            <RotateCw className={`w-4 h-4 ${statusLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Section 1: Health */}
      <section>
        <SectionHeader number={1} title="服务健康状态" icon={Activity} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {status.services.map((service) => (
            <HealthCard key={service.name} service={service} />
          ))}
        </div>
      </section>

      {/* Section 2: Resources */}
      <section>
        <SectionHeader number={2} title="系统资源" icon={Server} />
        {resourcesLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : resourcesError ? (
          <EmptyState title="加载失败" description={resourcesError} />
        ) : resources ? (
          <ResourceSection resources={resources} />
        ) : null}
      </section>

      {/* Section 3: Errors */}
      <section>
        <SectionHeader number={3} title="异常聚合" icon={AlertTriangle} />
        <ErrorSection errors={status.errors} />
      </section>

      {/* Section 4: Security Audit */}
      <section>
        <SectionHeader number={4} title="安全审计" icon={Shield} />
        <SecurityAudit />
      </section>

      {/* Section 5: Tools */}
      <section>
        <SectionHeader number={5} title="运维工具" icon={Stethoscope} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ToolCard
            title="一键备份数据库"
            description="导出当前数据库到 exports/backups 目录，支持下载。"
            icon={Download}
            buttonText="立即备份"
            onClick={handleBackup}
            loading={backupLoading}
            result={backupResult}
          />
          <ToolCard
            title="清理过期导出文件"
            description="删除超过 7 天的导出文件，释放磁盘空间。"
            icon={Trash2}
            buttonText="立即清理"
            onClick={handleCleanupExports}
            loading={cleanupExportsLoading}
            result={cleanupExportsResult}
          />
          <ToolCard
            title="清理临时文件"
            description="清理人脸识别临时文件和缓存数据。"
            icon={Eraser}
            buttonText="立即清理"
            onClick={handleCleanupTemp}
            loading={cleanupTempLoading}
            result={cleanupTempResult}
          />
          <ToolCard
            title="手动触发健康检查"
            description="立即检测所有服务的健康状态。"
            icon={Activity}
            buttonText="立即检查"
            onClick={loadAll}
            loading={statusLoading}
          />
        </div>
      </section>

      {/* Section 6: Runtime */}
      <section>
        <SectionHeader number={6} title="运行时信息" icon={Clock} />
        <RuntimeSection runtime={status.runtime} />
      </section>

      {/* Section 7: Logs */}
      <section>
        <SectionHeader number={7} title="服务器日志" icon={FileText} />
        <Card className="p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              placeholder="搜索日志内容"
              className="w-72"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Select className="w-40" value={level} onChange={(e) => setLevel(e.target.value)}>
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
