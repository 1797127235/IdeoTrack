import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { config } from '../../config/index.js';
import { query, queryOne } from '../../lib/db.js';

export interface CpuInfo {
  usagePercent: number;
  loadAverage: number[];
  cores: number;
}

export interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
}

export interface DiskInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  mount: string;
}

export interface DbSizeInfo {
  databaseBytes: number;
  tables: Array<{ name: string; sizeBytes: number }>;
}

export interface LogSizeInfo {
  appLogBytes: number;
}

export interface SystemResources {
  cpu: CpuInfo;
  memory: MemoryInfo;
  disk: DiskInfo;
  database: DbSizeInfo;
  log: LogSizeInfo;
  updatedAt: string;
}

function readCgroupMemoryLimit(): number | null {
  try {
    const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf-8').trim();
    const max = parseInt(limit, 10);
    // 如果 limit 是一个很大的值（如 9223372036854771712），说明没限制
    return max > 0 && max < os.totalmem() * 10 ? max : null;
  } catch {
    try {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf-8').trim();
      if (limit === 'max') return null;
      const max = parseInt(limit, 10);
      return max > 0 && max < os.totalmem() * 10 ? max : null;
    } catch {
      return null;
    }
  }
}

function readCgroupMemoryUsage(): number | null {
  try {
    const usage = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf-8').trim();
    return parseInt(usage, 10);
  } catch {
    try {
      const usage = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf-8').trim();
      return parseInt(usage, 10);
    } catch {
      return null;
    }
  }
}

export function getCpuInfo(): CpuInfo {
  try {
    // 计算一秒内的 CPU 使用率
    const readStat = () => {
      const data = fs.readFileSync('/proc/stat', 'utf-8');
      const line = data.split('\n')[0];
      const parts = line.split(/\s+/).slice(1).map(Number);
      const idle = parts[3];
      const total = parts.reduce((a, b) => a + b, 0);
      return { idle, total };
    };

    const before = readStat();
    // 100ms 采样
    const start = Date.now();
    while (Date.now() - start < 100) {
      // busy wait for precision
    }
    const after = readStat();

    const totalDiff = after.total - before.total;
    const idleDiff = after.idle - before.idle;
    const usagePercent = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;

    return {
      usagePercent,
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
    };
  } catch {
    return {
      usagePercent: 0,
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
    };
  }
}

export function getMemoryInfo(): MemoryInfo {
  const limit = readCgroupMemoryLimit();
  const usage = readCgroupMemoryUsage();

  if (limit && usage !== null) {
    return {
      totalBytes: limit,
      usedBytes: usage,
      freeBytes: Math.max(0, limit - usage),
      usagePercent: Math.round((usage / limit) * 100),
    };
  }

  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalBytes: total,
    usedBytes: used,
    freeBytes: free,
    usagePercent: Math.round((used / total) * 100),
  };
}

export function getDiskInfo(): DiskInfo {
  try {
    // 使用 df 获取 /app 或根目录磁盘使用情况
    const mount = '/app';
    const output = execSync(`df -B1 ${mount} 2>/dev/null || df -B1 /`, { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    const dataLine = lines.length > 1 ? lines[lines.length - 1] : '';
    const parts = dataLine.split(/\s+/);
    // Filesystem 1B-blocks Used Available Use% Mounted
    if (parts.length >= 4) {
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const free = parseInt(parts[3], 10);
      const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0;
      return { totalBytes: total, usedBytes: used, freeBytes: free, usagePercent, mount };
    }
  } catch {
    // ignore
  }

  return { totalBytes: 0, usedBytes: 0, freeBytes: 0, usagePercent: 0, mount: '/' };
}

export async function getDbSizeInfo(): Promise<DbSizeInfo> {
  try {
    const dbRow = await queryOne<{ pg_database_size: number }>(
      "SELECT pg_database_size(current_database()) AS pg_database_size"
    );
    const databaseBytes = dbRow?.pg_database_size || 0;

    const tables = await query<{ relname: string; pg_relation_size: number }>(
      `SELECT relname, pg_relation_size(relid) AS pg_relation_size
       FROM pg_stat_user_tables
       ORDER BY pg_relation_size DESC
       LIMIT 10`
    );

    return {
      databaseBytes,
      tables: tables.map((t) => ({ name: t.relname, sizeBytes: t.pg_relation_size })),
    };
  } catch {
    return { databaseBytes: 0, tables: [] };
  }
}

export function getLogSizeInfo(): LogSizeInfo {
  const logDir = config.logFileDir || path.resolve(process.cwd(), 'logs');
  const logPath = path.join(logDir, 'app.log');
  try {
    const stats = fs.statSync(logPath);
    return { appLogBytes: stats.size };
  } catch {
    return { appLogBytes: 0 };
  }
}

export async function getSystemResources(): Promise<SystemResources> {
  const [dbInfo] = await Promise.all([getDbSizeInfo()]);

  return {
    cpu: getCpuInfo(),
    memory: getMemoryInfo(),
    disk: getDiskInfo(),
    database: dbInfo,
    log: getLogSizeInfo(),
    updatedAt: new Date().toISOString(),
  };
}
