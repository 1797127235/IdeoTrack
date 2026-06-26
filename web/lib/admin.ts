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
