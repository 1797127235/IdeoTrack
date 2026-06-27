/**
 * 学习资料封面图本地存储。
 *
 * 封面图落盘到本地文件系统，数据库只存相对路径，避免大 blob 进库。
 *
 * 目录约定（生产通过 docker-compose bind mount 持久化）：
 *   {root}/learning-resources/covers/{fileId}.ext
 *
 * root 解析：优先 LEARNING_RESOURCE_UPLOAD_DIR（环境变量），否则进程工作目录下的 ./uploads。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function getUploadRoot(): string {
  return config.learningResourceUploadDir || path.join(process.cwd(), 'uploads');
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function isAllowedImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function getImageExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (ALLOWED_IMAGE_EXTS.includes(ext)) {
    return ext;
  }
  return '.jpg';
}

export async function saveCoverImage(buffer: Buffer, originalName: string): Promise<string> {
  const dir = path.join(getUploadRoot(), 'learning-resources', 'covers');
  await ensureDir(dir);

  const ext = getImageExtension(originalName);
  const fileId = randomUUID();
  const filePath = path.join(dir, `${fileId}${ext}`);

  await fs.writeFile(filePath, buffer);

  // 返回相对路径入库，避免绝对路径在迁移环境后失效
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  logger.info({ relPath }, '学习资料封面图已保存');
  return relPath;
}

export function resolveCoverPath(relPath: string): string {
  if (path.isAbsolute(relPath)) {
    return relPath;
  }
  return path.join(process.cwd(), relPath);
}

export async function deleteCoverImage(relPath: string | null | undefined): Promise<void> {
  if (!relPath) return;
  try {
    const absPath = resolveCoverPath(relPath);
    await fs.unlink(absPath);
    logger.info({ relPath }, '学习资料封面图已删除');
  } catch (err) {
    logger.warn({ relPath, err }, '删除学习资料封面图失败（忽略）');
  }
}
