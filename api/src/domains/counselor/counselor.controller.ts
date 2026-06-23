import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { getClassStudentList, getCounselorDashboard } from './counselor.service.js';
import type { StudentFilterStatus } from './counselor.types.js';

const VALID_STATUSES: StudentFilterStatus[] = ['all', 'checked_in', 'absent'];

export async function getDashboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const data = await getCounselorDashboard(req.user.userId, date);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
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

    const classId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const statusParam = typeof req.query.status === 'string' ? req.query.status : 'all';
    const status: StudentFilterStatus = VALID_STATUSES.includes(statusParam as StudentFilterStatus)
      ? (statusParam as StudentFilterStatus)
      : 'all';

    const data = await getClassStudentList(req.user.userId, classId, date, status);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
