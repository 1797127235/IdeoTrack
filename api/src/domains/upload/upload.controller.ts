import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { AppError } from '../../middleware/error-handler.js';
import {
  saveTaskCoverImage,
  resolveTaskCoverPath,
  isAllowedImageMimeType,
  saveAttachment,
  resolveAttachmentPath,
  isAllowedAttachmentMimeType,
} from '../../lib/resource-storage.js';

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedImageMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/webp 图片'));
    }
  },
});

export const uploadCoverMiddleware = coverUpload.single('cover');

export async function uploadCoverController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', '请上传图片文件', 400);
    }

    const relPath = await saveTaskCoverImage(req.file.buffer, req.file.originalname);
    // 返回公开访问路径，前端可直接用 <img src="/api/upload/cover?path=..." />
    res.json({ success: true, data: { path: relPath, url: `/api/upload/cover?path=${encodeURIComponent(relPath)}` } });
  } catch (error) {
    next(error);
  }
}

export async function serveCoverController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const relPath = req.query.path as string;
    if (!relPath) {
      throw new AppError('VALIDATION_ERROR', '缺少图片路径', 400);
    }

    // 防止路径穿越
    const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const absPath = resolveTaskCoverPath(safePath);

    // 只允许访问 uploads/task-covers 目录下的文件
    const uploadRoot = path.join(process.cwd(), 'uploads');
    if (!absPath.startsWith(uploadRoot)) {
      throw new AppError('ACCESS_DENIED', '无权访问该文件', 403);
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    const buffer = await fs.readFile(absPath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedAttachmentMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的附件格式'));
    }
  },
});

export const uploadAttachmentMiddleware = attachmentUpload.single('attachment');

export async function uploadAttachmentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', '请上传附件', 400);
    }

    const relPath = await saveAttachment(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      data: {
        path: relPath,
        url: `/api/upload/attachment?path=${encodeURIComponent(relPath)}`,
        name: req.file.originalname,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function serveAttachmentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const relPath = req.query.path as string;
    if (!relPath) {
      throw new AppError('VALIDATION_ERROR', '缺少附件路径', 400);
    }

    const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const absPath = resolveAttachmentPath(safePath);

    const uploadRoot = path.join(process.cwd(), 'uploads');
    if (!absPath.startsWith(uploadRoot)) {
      throw new AppError('ACCESS_DENIED', '无权访问该文件', 403);
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mov': 'video/quicktime',
    };
    const mimeType = mimeTypeMap[ext] || 'application/octet-stream';

    const buffer = await fs.readFile(absPath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
