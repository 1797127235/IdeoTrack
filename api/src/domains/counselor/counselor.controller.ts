import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import {
  exportClassCheckIns,
  getClassReminders,
  getClassStudentList,
  getCounselorDashboard,
  getTaskClassStats,
  sendReminders,
  MAX_EXPORT_CLASS_IDS,
} from './counselor.service.js';
import type { StudentFilterStatus } from './counselor.types.js';

const VALID_STATUSES: StudentFilterStatus[] = ['all', 'checked_in', 'absent'];

const MAX_BATCH_SIZE = 100;

const sendRemindersSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1).max(MAX_BATCH_SIZE),
  task_id: z.string().uuid('task_id 必须是 UUID'),
});

function parseClassId(raw: unknown): string {
  const parsed = z.string().uuid().safeParse(raw);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', '班级 ID 格式无效', 400);
  }
  return parsed.data;
}

export async function getDashboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const data = await getCounselorDashboard(req.user.userId);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function parseTaskId(raw: unknown): string {
  const parsed = z.string().uuid('task_id 必须是 UUID').safeParse(raw);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'task_id 格式无效', 400);
  }
  return parsed.data;
}

export async function getClassStudentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const classId = parseClassId(req.params.id);
    const taskId = parseTaskId(req.query.task_id);
    const statusParam = typeof req.query.status === 'string' ? req.query.status : 'all';
    const status: StudentFilterStatus = VALID_STATUSES.includes(statusParam as StudentFilterStatus)
      ? (statusParam as StudentFilterStatus)
      : 'all';

    const data = await getClassStudentList(req.user.userId, classId, taskId, status);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function sendRemindersController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const classId = parseClassId(req.params.id);
    const parsed = sendRemindersSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await sendReminders(req.user.userId, classId, parsed.data);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getClassRemindersController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const classId = parseClassId(req.params.id);
    const taskId = parseTaskId(req.query.task_id);
    const data = await getClassReminders(req.user.userId, classId, taskId);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTaskClassesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const taskId = parseTaskId(req.params.id);
    const data = await getTaskClassStats(req.user.userId, taskId);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const exportCheckInsSchema = z.object({
  class_ids: z.array(z.string().uuid()).min(1, '至少选择一个班级').max(MAX_EXPORT_CLASS_IDS, `class_ids 数量不能超过 ${MAX_EXPORT_CLASS_IDS}`),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date 必须是 YYYY-MM-DD 格式'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date 必须是 YYYY-MM-DD 格式'),
});

export async function exportCheckInsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parsed = exportCheckInsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await exportClassCheckIns(req.user.userId, parsed.data);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
