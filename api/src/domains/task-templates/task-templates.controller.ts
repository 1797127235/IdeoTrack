import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { auditLog } from '../../lib/audit.js';
import * as templateService from './task-templates.service.js';
import { createTaskTemplateSchema, updateTaskTemplateSchema } from './task-templates.schema.js';
import type { CreateTaskTemplateInput, UpdateTaskTemplateInput } from './task-templates.types.js';

function getClientInfo(req: Request) {
  return {
    ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

export async function listTaskTemplatesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const filters: { status?: 'published' | 'delisted' } = {};
    if (req.query.status === 'published' || req.query.status === 'delisted') {
      filters.status = req.query.status;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await templateService.listTaskTemplates(filters, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getTaskTemplateByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const template = await templateService.getTaskTemplateById(id);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

export async function createTaskTemplateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createTaskTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const template = await templateService.createTaskTemplate(
      req.user.userId,
      parseResult.data as CreateTaskTemplateInput
    );

    void auditLog({
      action: 'create',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task_template',
      targetId: template.id,
      targetName: template.title,
      details: { status: template.status },
      ...getClientInfo(req),
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskTemplateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = updateTaskTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const template = await templateService.updateTaskTemplate(
      id,
      parseResult.data as UpdateTaskTemplateInput
    );

    void auditLog({
      action: 'update',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task_template',
      targetId: template.id,
      targetName: template.title,
      details: parseResult.data,
      ...getClientInfo(req),
    });

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

export async function delistTaskTemplateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const template = await templateService.delistTaskTemplate(id);

    void auditLog({
      action: 'delete',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task_template',
      targetId: template.id,
      targetName: template.title,
      ...getClientInfo(req),
    });

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskTemplateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await templateService.deleteTaskTemplate(id);

    void auditLog({
      action: 'delete',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task_template',
      targetId: id,
      ...getClientInfo(req),
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
