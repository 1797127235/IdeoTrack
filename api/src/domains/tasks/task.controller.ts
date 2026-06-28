import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { auditLog } from '../../lib/audit.js';
import * as taskService from './task.service.js';
import { createTaskSchema, createTaskFromTemplateSchema, updateTaskSchema, type CreateTaskInput, type UpdateTaskInput } from './task.schema.js';

function getClientInfo(req: Request) {
  return {
    ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

export async function createTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createTaskSchema.safeParse(req.body);
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

    const task = await taskService.createTask(req.user.userId, req.user.role, parseResult.data as CreateTaskInput);
    void auditLog({
      action: 'create',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task',
      targetId: task.id,
      targetName: task.title,
      details: { scopeType: task.scope_type },
      ...getClientInfo(req),
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function createTaskFromTemplateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createTaskFromTemplateSchema.safeParse(req.body);
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

    const tasks = await taskService.createTaskFromTemplate(
      req.user.userId,
      req.user.role,
      parseResult.data
    );

    void auditLog({
      action: 'create',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task',
      targetId: tasks[0]?.id,
      targetName: tasks[0]?.title,
      details: { source: 'template', count: tasks.length },
      ...getClientInfo(req),
    });

    res.status(201).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
}

export async function listTasksController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const filters: { status?: 'published' | 'delisted'; scopeType?: 'school' | 'college' | 'class' } = {};
    if (req.query.status === 'published' || req.query.status === 'delisted') {
      filters.status = req.query.status;
    }
    if (req.query.scope_type === 'school' || req.query.scope_type === 'college' || req.query.scope_type === 'class') {
      filters.scopeType = req.query.scope_type;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await taskService.listTasks(req.user.userId, req.user.role, filters, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = updateTaskSchema.safeParse(req.body);
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
    if (parseResult.data.status !== undefined) {
      throw new AppError(
        'VALIDATION_ERROR',
        '任务状态不可通过更新接口修改，请使用下架接口',
        400
      );
    }
    const task = await taskService.updateTask(req.user.userId, req.user.role, id, parseResult.data as UpdateTaskInput);
    void auditLog({
      action: 'update',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task',
      targetId: task.id,
      targetName: task.title,
      details: parseResult.data,
      ...getClientInfo(req),
    });
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function delistTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = await taskService.delistTask(req.user.userId, req.user.role, id);
    void auditLog({
      action: 'delete',
      category: 'task',
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetType: 'task',
      targetId: task.id,
      targetName: task.title,
      ...getClientInfo(req),
    });
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function listMyTasksController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const tasks = await taskService.listMyTasks(req.user.userId, page, limit);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
}

export async function getMyTaskDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = await taskService.getMyTaskDetail(req.user.userId, id);
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function getTaskByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = await taskService.fetchTaskById(id);
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function getTaskStatsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const stats = await taskService.getTaskStats(req.user.userId, req.user.role, id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
