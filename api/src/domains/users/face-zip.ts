/**
 * zip 注册照解析。
 *
 * 解压管理员上传的 zip 包，提取其中的图片文件，按文件名（去扩展名）作为学号。
 * 仅取常见图片格式，跳过子目录与非图片文件。
 *
 * 返回 { schoolId, buffer, ext } 列表，交给 service 按学号匹配用户。
 */

import { fromBuffer as zipFromBuffer, type ZipFile } from 'yauzl-promise';
import { AppError } from '../../middleware/error-handler.js';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

export interface ZipFaceEntry {
  schoolId: string;
  buffer: Buffer;
  ext: string;
}

export async function parseZipFaces(zipBuffer: Buffer): Promise<ZipFaceEntry[]> {
  let zip: ZipFile;
  try {
    zip = await zipFromBuffer(zipBuffer, { lazyEntries: true });
  } catch {
    throw new AppError('INVALID_ZIP', '无法解析 zip 文件', 400);
  }

  const entries: ZipFaceEntry[] = [];
  const stream = zip;

  try {
    for await (const entry of stream) {
      // 跳过目录与非图片
      if (/\/$/.test(entry.fileName)) continue;

      const baseName = entry.fileName.split('/').pop() || '';
      const dot = baseName.lastIndexOf('.');
      if (dot < 0) continue;
      const ext = baseName.slice(dot + 1).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;

      const schoolId = baseName.slice(0, dot).trim();
      if (!schoolId) continue;

      // 读取条目内容
      const buffers: Buffer[] = [];
      for await (const chunk of entry) {
        buffers.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
      entries.push({ schoolId, buffer: Buffer.concat(buffers), ext });
    }
  } finally {
    await zip.close();
  }

  if (entries.length === 0) {
    throw new AppError('NO_IMAGES_IN_ZIP', 'zip 包内未找到可用的图片文件', 400);
  }

  return entries;
}
