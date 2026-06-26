import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { reverseGeocode } from '../../lib/geo.js';
import { createOrUpdateCheckIn, getCheckInResult, getStudentCalendar, submitReflection, getStudyRecords } from './checkins.service.js';
import { createCheckInSchema, submitReflectionSchema } from './checkins.schema.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function reverseGeocodeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new AppError('VALIDATION_ERROR', 'lat 和 lng 必须为有效数字', 400);
    }

    const result = await reverseGeocode(lat, lng);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createCheckIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parseResult = createCheckInSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    const checkIn = await createOrUpdateCheckIn(req.user.userId, parseResult.data);

    res.status(200).json({
      success: true,
      data: checkIn,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitReflectionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = submitReflectionSchema.safeParse({
      check_in_id: id,
      content: req.body.content,
    });
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    const checkIn = await submitReflection(req.user.userId, parseResult.data);

    res.status(200).json({
      success: true,
      data: checkIn,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCheckInResultController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isUuid(id)) {
      throw new AppError('VALIDATION_ERROR', '打卡记录 ID 无效', 400);
    }

    const result = await getCheckInResult(req.user.userId, id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentCalendarController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);

    if (Number.isNaN(year) || Number.isNaN(month)) {
      throw new AppError('VALIDATION_ERROR', '年份和月份不能为空', 400);
    }

    const result = await getStudentCalendar(req.user.userId, year, month);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudyRecordsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const type = req.query.type as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await getStudyRecords(req.user.userId, type, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
