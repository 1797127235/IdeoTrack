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

export async function fetchServerLogs(): Promise<string[]> {
  return api.get<string[]>("/admin/logs");
}

export async function fetchAdminStatus(): Promise<AdminStatus> {
  return api.get<AdminStatus>("/admin/status");
}
