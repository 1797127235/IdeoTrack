import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { promises as fs } from 'node:fs';
import { AppError } from '../../middleware/error-handler.js';
import { auditLog } from '../../lib/audit.js';
import { saveCoverImage, resolveCoverPath, isAllowedImageMimeType } from '../../lib/resource-storage.js';
import * as learningResourceService from './learning-resources.service.js';
import {
  createLearningResourceSchema,
  updateLearningResourceSchema,
  updateStatusSchema,
} from './learning-resources.schema.js';
import type { CreateLearningResourceInput, UpdateLearningResourceInput } from './learning-resources.types.js';

// 封面图上传：内存存储，限 5MB，仅图片
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

function getAuditContext(req: Request) {
  const ip = req.ip || req.socket.remoteAddress;
  return {
    actorId: req.user?.userId,
    actorRole: req.user?.role,
    ipAddress: Array.isArray(ip) ? ip[0] : ip,
    userAgent: req.headers['user-agent'],
  };
}

function parseTags(raw: unknown): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return undefined;
}

async function parseCreateInput(req: Request): Promise<CreateLearningResourceInput> {
  const raw = {
    title: req.body.title,
    description: req.body.description ?? null,
    type: req.body.type,
    content: req.body.content ?? null,
    url: req.body.url ?? null,
    category: req.body.category ?? null,
    tags: parseTags(req.body.tags),
    status: req.body.status ?? 'published',
  };

  const parseResult = createLearningResourceSchema.safeParse(raw);
  if (!parseResult.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      400
    );
  }

  return parseResult.data;
}

async function parseUpdateInput(req: Request): Promise<UpdateLearningResourceInput> {
  const raw: UpdateLearningResourceInput = {};
  if (req.body.title !== undefined) raw.title = req.body.title;
  if (req.body.description !== undefined) raw.description = req.body.description ?? null;
  if (req.body.type !== undefined) raw.type = req.body.type;
  if (req.body.content !== undefined) raw.content = req.body.content ?? null;
  if (req.body.url !== undefined) raw.url = req.body.url ?? null;
  if (req.body.category !== undefined) raw.category = req.body.category ?? null;
  if (req.body.tags !== undefined) raw.tags = parseTags(req.body.tags);
  if (req.body.status !== undefined) raw.status = req.body.status;

  const parseResult = updateLearningResourceSchema.safeParse(raw);
  if (!parseResult.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      400
    );
  }

  return parseResult.data;
}

async function handleCoverFile(req: Request): Promise<string | undefined> {
  if (!req.file) return undefined;
  return saveCoverImage(req.file.buffer, req.file.originalname);
}

export async function listLearningResourcesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const filters: Parameters<typeof learningResourceService.listLearningResources>[0] = {};
    if (req.query.type === 'article' || req.query.type === 'video' || req.query.type === 'document' || req.query.type === 'link') {
      filters.type = req.query.type;
    }
    if (req.query.category) {
      filters.category = String(req.query.category);
    }
    if (req.query.status === 'draft' || req.query.status === 'published') {
      filters.status = req.query.status;
    }

    const result = await learningResourceService.listLearningResources(filters, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getLearningResourceByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const resource = await learningResourceService.getLearningResourceById(id);
    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function createLearningResourceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const input = await parseCreateInput(req);
    const coverUrl = await handleCoverFile(req);

    const resource = await learningResourceService.createLearningResource(req.user.userId, {
      ...input,
      cover_url: coverUrl ?? input.cover_url,
    });

    void auditLog({
      action: 'create',
      category: 'learning_resource',
      ...getAuditContext(req),
      targetType: 'learning_resource',
      targetId: resource.id,
      targetName: resource.title,
      details: { type: resource.type, category: resource.category },
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function updateLearningResourceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const input = await parseUpdateInput(req);
    const coverUrl = await handleCoverFile(req);

    if (coverUrl) {
      input.cover_url = coverUrl;
    }

    const resource = await learningResourceService.updateLearningResource(id, input);

    void auditLog({
      action: 'update',
      category: 'learning_resource',
      ...getAuditContext(req),
      targetType: 'learning_resource',
      targetId: resource.id,
      targetName: resource.title,
      details: input as Record<string, unknown>,
    });

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function updateLearningResourceStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    const resource = await learningResourceService.updateLearningResourceStatus(id, parseResult.data.status);
    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function deleteLearningResourceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await learningResourceService.deleteLearningResource(id);

    void auditLog({
      action: 'delete',
      category: 'learning_resource',
      ...getAuditContext(req),
      targetType: 'learning_resource',
      targetId: id,
    });

    res.json({ success: true, data: null });
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const resource = await learningResourceService.getLearningResourceByIdWithoutIncrement(id);

    if (!resource.cover_url) {
      throw new AppError('COVER_NOT_FOUND', '封面图不存在', 404);
    }

    const filePath = resolveCoverPath(resource.cover_url);
    const fileBuffer = await fs.readFile(filePath);

    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
}
