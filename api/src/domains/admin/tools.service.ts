import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { config } from '../../config/index.js';

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

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createDatabaseBackup(): BackupResult {
  const backupDir = config.exportFileDir
    ? path.join(config.exportFileDir, 'backups')
    : path.resolve(process.cwd(), 'exports', 'backups');
  ensureDir(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `ideo_track_backup_${timestamp}.sql`;
  const filePath = path.join(backupDir, fileName);

  const dbUrl = config.databaseUrl;
  execSync(`pg_dump "${dbUrl}" > "${filePath}"`, { stdio: 'pipe' });

  const stats = fs.statSync(filePath);
  return {
    fileName,
    filePath,
    sizeBytes: stats.size,
    createdAt: new Date().toISOString(),
  };
}

export function cleanupExports(maxAgeDays = 7): CleanupResult {
  const exportsDir = config.exportFileDir || path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    return { deletedFiles: [], freedBytes: 0 };
  }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const deletedFiles: string[] = [];
  let freedBytes = 0;

  for (const entry of fs.readdirSync(exportsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath = path.join(exportsDir, entry.name);
    const stats = fs.statSync(filePath);
    if (stats.mtimeMs < cutoff) {
      deletedFiles.push(entry.name);
      freedBytes += stats.size;
      fs.unlinkSync(filePath);
    }
  }

  return { deletedFiles, freedBytes };
}

export function cleanupTempFiles(): CleanupResult {
  // 清理临时文件：例如超过 7 天的人脸注册临时文件
  // 当前项目没有明确的 temp 目录，先清理 faces 下可能残留的临时文件
  const facesDir = config.facePhotoDir || path.resolve(process.cwd(), 'faces');
  if (!fs.existsSync(facesDir)) {
    return { deletedFiles: [], freedBytes: 0 };
  }

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const deletedFiles: string[] = [];
  let freedBytes = 0;

  const scanDir = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        // 删除文件名包含 .tmp 或超过 7 天的文件
        if (entry.name.endsWith('.tmp') || stats.mtimeMs < cutoff) {
          deletedFiles.push(path.relative(facesDir, fullPath));
          freedBytes += stats.size;
          fs.unlinkSync(fullPath);
        }
      }
    }
  };

  scanDir(facesDir);
  return { deletedFiles, freedBytes };
}
