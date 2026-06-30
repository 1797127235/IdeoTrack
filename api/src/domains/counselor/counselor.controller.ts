import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import {
  exportClassCheckIns,
  exportDashboardReport,
  exportTaskCheckIns,
  getCheckInTrend,
  getClassDetail,
  getClassRanking,
  getClassReminders,
  getClassStudentList,
  getCounselorClasses,
  getCounselorDashboard,
  getHighRiskStudents,
  getTaskCheckInDetail,
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

const highRiskQuerySchema = z.object({
  window_size: z.coerce.number().int().min(1).max(30).default(7),
  absent_threshold: z.coerce.number().int().min(1).max(30).default(3),
});

const checkInTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  classId: z.string().uuid('classId 必须是 UUID').optional(),
});

const dashboardQuerySchema = z.object({
  classId: z.string().uuid('classId 必须是 UUID').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate 必须是 YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate 必须是 YYYY-MM-DD').optional(),
});

const reportExportSchema = z
  .object({
    period: z.enum(['week', 'month', 'custom']),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date 必须是 YYYY-MM-DD')
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date 必须是 YYYY-MM-DD')
      .optional(),
    class_id: z.string().uuid('class_id 必须是 UUID').optional().nullable(),
    report_type: z.enum(['summary', 'class', 'student']),
    format: z.enum(['pdf', 'excel']),
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return Boolean(data.start_date) && Boolean(data.end_date);
      }
      return true;
    },
    {
      message: '自定义周期必须提供 start_date 和 end_date',
      path: ['period'],
    }
  );

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

    const parsed = dashboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await getCounselorDashboard(req.user.userId, {
      classId: parsed.data.classId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCheckInTrendController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parsed = checkInTrendQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await getCheckInTrend(req.user.userId, parsed.data.days, parsed.data.classId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCounselorClassesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const data = await getCounselorClasses(req.user.userId);

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

export async function getClassDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const classId = parseClassId(req.params.id);
    const data = await getClassDetail(req.user.userId, classId);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getHighRiskStudentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parsed = highRiskQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await getHighRiskStudents(
      req.user.userId,
      parsed.data.window_size,
      parsed.data.absent_threshold
    );

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getClassRankingController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parsed = dashboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await getClassRanking(req.user.userId, {
      classId: parsed.data.classId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function exportReportController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parsed = reportExportSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400);
    }

    const data = await exportDashboardReport(req.user.userId, parsed.data);
    res.status(201).json({ success: true, data });
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

export async function getTaskCheckInDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const taskId = parseTaskId(req.params.id);
    const data = await getTaskCheckInDetail(req.user.userId, taskId);

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

export async function exportTaskCheckInsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const taskId = parseTaskId(req.params.id);
    const data = await exportTaskCheckIns(req.user.userId, taskId);

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
