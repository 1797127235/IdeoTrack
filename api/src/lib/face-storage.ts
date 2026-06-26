/**
 * 人脸图片本地存储。
 *
 * 注册照（管理员导入）与现场照（学生打卡）都落盘到本地文件系统，
 * 数据库只存相对路径，避免大 blob 进库。
 *
 * 目录约定（生产通过 docker-compose bind mount 持久化）：
 *   {root}/registered/{userId}.jpg   注册照
 *   {root}/captured/{checkInId}.jpg  现场照
 *
 * root 解析：优先 FACE_PHOTO_DIR（环境变量），否则进程工作目录下的 ./faces。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getFaceRoot(): string {
  return config.facePhotoDir || path.join(process.cwd(), 'faces');
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** 保存注册照。文件名用 userId，便于按用户定位与覆盖更新。 */
export async function saveRegisteredPhoto(userId: string, buffer: Buffer, ext: string): Promise<string> {
  if (!UUID_RE.test(userId)) {
    throw new Error('Invalid userId for face photo path');
  }
  const dir = path.join(getFaceRoot(), 'registered');
  await ensureDir(dir);
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
  const filePath = path.join(dir, `${userId}${safeExt}`);
  await fs.writeFile(filePath, buffer);
  // 返回相对路径入库，避免绝对路径在迁移环境后失效
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  logger.info({ userId, relPath }, '注册照已保存');
  return relPath;
}

/** 保存现场照。文件名用随机 UUID（与 check_in 关联）。 */
export async function saveCapturedPhoto(buffer: Buffer, ext: string): Promise<string> {
  const dir = path.join(getFaceRoot(), 'captured');
  await ensureDir(dir);
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
  const fileId = randomUUID();
  const filePath = path.join(dir, `${fileId}${safeExt}`);
  await fs.writeFile(filePath, buffer);
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  logger.info({ relPath }, '现场照已保存');
  return relPath;
}

/** 读取注册照字节，供比对用。 */
export async function readRegisteredPhoto(relPath: string): Promise<Buffer> {
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
  return fs.readFile(absPath);
}

/** 删除注册照文件（best-effort，失败仅记录日志）。 */
export async function deleteRegisteredPhoto(relPath: string): Promise<void> {
  try {
    const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
    await fs.unlink(absPath);
    logger.info({ relPath }, '注册照已删除');
  } catch (err) {
    logger.warn({ relPath, err }, '删除注册照失败（忽略）');
  }
}
