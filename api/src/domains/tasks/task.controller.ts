import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import * as taskService from './task.service.js';
import { createTaskSchema, dispatchTaskSchema, updateTaskSchema } from './task.schema.js';

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

    const task = await taskService.createTask(req.user.userId, req.user.role, parseResult.data);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function dispatchTaskController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = dispatchTaskSchema.safeParse(req.body);
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

    const task = await taskService.dispatchTask(req.user.userId, req.user.role, parseResult.data);
    res.status(201).json({ success: true, data: task });
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

    const filters: { status?: 'published' | 'delisted'; scopeType?: 'school' | 'college' | 'class' | 'pool' } = {};
    if (req.query.status === 'published' || req.query.status === 'delisted') {
      filters.status = req.query.status;
    }
    if (req.query.scope_type === 'school' || req.query.scope_type === 'college' || req.query.scope_type === 'class' || req.query.scope_type === 'pool') {
      filters.scopeType = req.query.scope_type;
    }

    // P3: 管理端分页参数
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
    // P1: status 不再通过 update 修改，强制走 delist 端点
    if (parseResult.data.status !== undefined) {
      throw new AppError(
        'VALIDATION_ERROR',
        '任务状态不可通过更新接口修改，请使用下架接口',
        400
      );
    }
    const task = await taskService.updateTask(req.user.userId, req.user.role, id, parseResult.data);
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

// DN-1: 任务池查询端点（辅导员专用）
export async function listTaskPoolController(
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

    const result = await taskService.listTaskPool(req.user.userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// P2: 获取单个任务详情（管理员/辅导员）
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

// AC-5: 任务统计端点
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
