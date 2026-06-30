import { AppError } from '../../middleware/error-handler.js';
import {
  listPendingReviewsForCounselor,
  getPendingReviewDetail,
  makeReviewDecision,
} from './reviews.service.js';
import type { Request, Response, NextFunction } from 'express';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertCounselor(req: Request): string {
  if (!req.user || req.user.role !== 'counselor') {
    throw new AppError('ACCESS_DENIED', '仅辅导员可访问该资源', 403);
  }
  return req.user.userId;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function listPendingReviewsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const counselorId = assertCounselor(req);

    const { classId, taskId } = req.query;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);

    const data = await listPendingReviewsForCounselor(counselorId, {
      classId: typeof classId === 'string' && UUID_RE.test(classId) ? classId : undefined,
      taskId: typeof taskId === 'string' && UUID_RE.test(taskId) ? taskId : undefined,
      page,
      limit,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getPendingReviewDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const counselorId = assertCounselor(req);
    const id = req.params.id as string;

    if (!id || !UUID_RE.test(id)) {
      throw new AppError('VALIDATION_ERROR', '打卡记录 ID 无效', 400);
    }

    const data = await getPendingReviewDetail(counselorId, id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

const VALID_DECISIONS = ['approve', 'reject', 'require_modification'];

export async function reviewCheckInController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const counselorId = assertCounselor(req);
    const id = req.params.id as string;
    const { decision, feedback } = req.body;

    if (!id || !UUID_RE.test(id)) {
      throw new AppError('VALIDATION_ERROR', '打卡记录 ID 无效', 400);
    }

    if (!VALID_DECISIONS.includes(decision)) {
      throw new AppError('VALIDATION_ERROR', '复核决策无效', 400);
    }

    const data = await makeReviewDecision({
      checkInId: id,
      counselorId,
      decision: decision as 'approve' | 'reject' | 'require_modification',
      feedback: typeof feedback === 'string' ? feedback.trim() : undefined,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
