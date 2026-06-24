import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from './logger.js';

/**
 * 文件存储模块（AD-7）。
 *
 * V1 采用本地临时文件方案（项目已从 Supabase 迁移到自托管 PostgreSQL，
 * 见 ARCHITECTURE-SPINE.md changelog；AD-7 现规为"本地临时文件或 S3 兼容对象存储"）。
 *
 * 设计为可扩展：V2 接入 S3 兼容对象存储时，只需替换 saveExportFile/resolveFilePath
 * 的实现，调用方（counselor.service）签名不变。
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 解析导出文件根目录。
 * 优先 config.exportFileDir；未配置时回退到进程工作目录下的 ./exports。
 */
function getExportRoot(): string {
  return config.exportFileDir || path.join(process.cwd(), 'exports');
}

interface DownloadTokenPayload {
  fileId: string;
}

/**
 * 将导出文件写入本地临时目录。
 * 文件名使用随机 UUID，避免碰撞且便于签名校验。
 * @returns fileId（UUID）与绝对路径
 */
export async function saveExportFile(buffer: Buffer, ext: string): Promise<{ fileId: string; filePath: string }> {
  const root = getExportRoot();
  await fs.mkdir(root, { recursive: true });
  const fileId = randomUUID();
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
  const filePath = path.join(root, `${fileId}${safeExt}`);
  await fs.writeFile(filePath, buffer);
  logger.info({ fileId, dir: root }, '导出文件已写入');
  return { fileId, filePath };
}

/**
 * 为指定文件签发下载 token（AD-7：24h 有效）。
 * 复用 JWT（jsonwebtoken 已安装）与 config.jwtSecret。
 */
export function signDownloadToken(fileId: string): string {
  return jwt.sign({ fileId } as DownloadTokenPayload, config.jwtSecret, {
    expiresIn: config.exportLinkTtlSeconds,
  });
}

/**
 * 校验下载 token。过期或无效返回 null。
 */
export function verifyDownloadToken(token: string): { fileId: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as DownloadTokenPayload;
    if (typeof payload.fileId !== 'string' || !UUID_RE.test(payload.fileId)) {
      return null;
    }
    return { fileId: payload.fileId };
  } catch {
    return null;
  }
}

/**
 * 根据 fileId 拼接绝对路径。
 * fileId 必须为合法 UUID，防止目录穿越（如 ../../etc/passwd）。
 */
export function resolveFilePath(fileId: string): string {
  if (!UUID_RE.test(fileId)) {
    throw new Error('Invalid fileId');
  }
  return path.join(getExportRoot(), `${fileId}.xlsx`);
}

/**
 * 下载后删除文件（可选，资源回收）。
 * 失败仅记录日志，不抛错（下载已完成，不应因清理失败影响用户）。
 */
export async function deleteExportFile(fileId: string): Promise<void> {
  if (!UUID_RE.test(fileId)) return;
  const filePath = resolveFilePath(fileId);
  try {
    await fs.unlink(filePath);
    logger.info({ fileId }, '导出文件已清理');
  } catch (err) {
    logger.warn({ fileId, err }, '清理导出文件失败（忽略）');
  }
}
