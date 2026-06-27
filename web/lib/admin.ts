import { api } from "./api";

export interface HealthStatus {
  name: string;
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
  message?: string;
  lastCheckedAt: string;
}

export interface RuntimeInfo {
  version: string;
  commitHash: string;
  imageTag: string;
  startedAt: string;
  uptimeSeconds: number;
  nodeEnv: string;
}

export interface ErrorStats {
  totalErrors24h: number;
  topErrorEndpoints: Array<{ path: string; count: number }>;
  levelDistribution: Array<{ level: string; count: number }>;
}

export interface AdminStatus {
  services: HealthStatus[];
  runtime: RuntimeInfo;
  errors: ErrorStats;
  updatedAt: string;
}

export interface SystemResources {
  cpu: {
    usagePercent: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
    mount: string;
  };
  database: {
    databaseBytes: number;
    tables: Array<{ name: string; sizeBytes: number }>;
  };
  log: {
    appLogBytes: number;
  };
  updatedAt: string;
}

export interface BackupResult {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CleanupResult {
  deletedFiles: string[];
  freedBytes: number;
}

export interface AuditLog {
  id: string;
  action: string;
  category: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  success: boolean;
  created_at: string;
}

export async function fetchServerLogs(): Promise<string[]> {
  return api.get<string[]>("/admin/logs");
}

// 下载完整服务器日志（JSONL），流式返回 app.log 全文，无截断
export async function downloadServerLogs(): Promise<void> {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  const res = await fetch(`${API_BASE_URL}/admin/logs/download`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    let message = `下载失败: ${res.status}`;
    try {
      const json = (await res.json()) as { error?: { message?: string } };
      if (json.error?.message) message = json.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  // 优先用后端给出的文件名，否则用默认名
  const disposition = res.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const fileName = match ? match[1] : `app-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.log`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAdminStatus(): Promise<AdminStatus> {
  return api.get<AdminStatus>("/admin/status");
}

export async function fetchSystemResources(): Promise<SystemResources> {
  return api.get<SystemResources>("/admin/resources");
}

export async function fetchAuditLogs(params?: {
  category?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.action) searchParams.set("action", params.action);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  return api.get<AuditLog[]>(`/admin/audit-logs${query ? `?${query}` : ""}`);
}

export async function createDatabaseBackup(): Promise<BackupResult> {
  return api.post<BackupResult>("/admin/backup", {});
}

export async function cleanupExports(): Promise<CleanupResult> {
  return api.post<CleanupResult>("/admin/cleanup/exports", {});
}

export async function cleanupTempFiles(): Promise<CleanupResult> {
  return api.post<CleanupResult>("/admin/cleanup/temp", {});
}
