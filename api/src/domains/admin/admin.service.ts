import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config/index.js';
import { queryOne } from '../../lib/db.js';

const startTime = Date.now();

/** 轻量级 HTTP 健康检查 */
async function checkHttpHealth(
  name: string,
  url: string,
  options: { timeout?: number; method?: string } = {}
): Promise<{ name: string; status: 'healthy' | 'unhealthy'; responseTimeMs: number; message?: string }> {
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const responseTimeMs = Date.now() - start;
    if (response.ok || response.status === 304) {
      return { name, status: 'healthy', responseTimeMs };
    }
    return { name, status: 'unhealthy', responseTimeMs, message: `HTTP ${response.status}` };
  } catch (err) {
    clearTimeout(timer);
    return {
      name,
      status: 'unhealthy',
      responseTimeMs: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface HealthStatus {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTimeMs: number;
  message?: string;
  lastCheckedAt: string;
}

export async function getServicesHealth(): Promise<HealthStatus[]> {
  const checks: Promise<HealthStatus>[] = [
    Promise.resolve({
      name: 'API服务',
      status: 'healthy',
      responseTimeMs: 0,
      lastCheckedAt: new Date().toISOString(),
    }),
  ];

  // Web 服务：通过 Docker 内部网络访问
  checks.push(
    checkHttpHealth('Web后台', 'http://web:3001/admin/login')
      .then((r) => ({ ...r, lastCheckedAt: new Date().toISOString() }))
  );

  // 数据库
  checks.push(
    (async () => {
      const start = Date.now();
      try {
        await queryOne('SELECT 1 as ok');
        return {
          name: '数据库',
          status: 'healthy' as const,
          responseTimeMs: Date.now() - start,
          lastCheckedAt: new Date().toISOString(),
        };
      } catch (err) {
        return {
          name: '数据库',
          status: 'unhealthy' as const,
          responseTimeMs: Date.now() - start,
          message: err instanceof Error ? err.message : String(err),
          lastCheckedAt: new Date().toISOString(),
        };
      }
    })()
  );

  // 人脸识别服务
  if (config.faceServiceUrl) {
    checks.push(
      checkHttpHealth('人脸识别服务', `${config.faceServiceUrl}/health`)
        .then((r) => ({ ...r, lastCheckedAt: new Date().toISOString() }))
    );
  }

  return Promise.all(checks);
}

export interface RuntimeInfo {
  version: string;
  commitHash: string;
  imageTag: string;
  startedAt: string;
  uptimeSeconds: number;
  nodeEnv: string;
}

export function getRuntimeInfo(): RuntimeInfo {
  let version = 'unknown';
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
    version = pkg.version || 'unknown';
  } catch {
    // ignore
  }

  return {
    version,
    commitHash: process.env.GIT_COMMIT || 'unknown',
    imageTag: process.env.IMAGE_TAG || 'unknown',
    startedAt: new Date(startTime).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    nodeEnv: config.nodeEnv,
  };
}

export interface ErrorStats {
  totalErrors24h: number;
  topErrorEndpoints: Array<{ path: string; count: number }>;
  levelDistribution: Array<{ level: string; count: number }>;
}

export function getErrorStats(): ErrorStats {
  const logDir = config.logFileDir || path.resolve(process.cwd(), 'logs');
  const logPath = path.join(logDir, 'app.log');

  if (!fs.existsSync(logPath)) {
    return { totalErrors24h: 0, topErrorEndpoints: [], levelDistribution: [] };
  }

  const stats = fs.statSync(logPath);
  const maxBytes = 2 * 1024 * 1024; // 读最后 2MB
  const start = Math.max(0, stats.size - maxBytes);
  const fd = fs.openSync(logPath, 'r');
  const buffer = Buffer.alloc(stats.size - start);
  fs.readSync(fd, buffer, 0, buffer.length, start);
  fs.closeSync(fd);

  let raw = buffer.toString('utf-8');
  if (start > 0) {
    const firstNewline = raw.indexOf('\n');
    if (firstNewline !== -1) {
      raw = raw.slice(firstNewline + 1);
    }
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const endpointCounts = new Map<string, number>();
  const levelCounts = new Map<string, number>();
  let totalErrors24h = 0;

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const time = typeof entry.time === 'number' ? entry.time : 0;
      if (time < cutoff) continue;

      const level = entry.level;
      if (level === 50 || level === 'error' || level === 40 || level === 'warn') {
        totalErrors24h++;

        // 统计级别
        const levelLabel = level === 50 || level === 'error' ? 'ERROR' : 'WARN';
        levelCounts.set(levelLabel, (levelCounts.get(levelLabel) || 0) + 1);

        // 统计接口
        const pathStr = typeof entry.path === 'string' ? entry.path : '';
        if (pathStr) {
          endpointCounts.set(pathStr, (endpointCounts.get(pathStr) || 0) + 1);
        }
      } else if (typeof level === 'number' || typeof level === 'string') {
        const levelLabel = typeof level === 'number' ? `LEVEL_${level}` : String(level).toUpperCase();
        levelCounts.set(levelLabel, (levelCounts.get(levelLabel) || 0) + 1);
      }
    } catch {
      // ignore malformed lines
    }
  }

  const topErrorEndpoints = Array.from(endpointCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

  const levelDistribution = Array.from(levelCounts.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);

  return { totalErrors24h, topErrorEndpoints, levelDistribution };
}
