import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { createOrUpdateCheckIn } from './checkins.service.js';
import { createCheckInSchema } from './checkins.schema.js';

export async function createCheckIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createCheckInSchema.safeParse(req.body);
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

    const checkIn = await createOrUpdateCheckIn(req.user.userId, parseResult.data);

    res.status(200).json({
      success: true,
      data: checkIn,
    });
  } catch (err) {
    next(err);
  }
}
