import type { Request, Response, NextFunction } from 'express';
import { createOrUpdateCheckIn } from './checkins.service.js';
import type { CreateCheckInInput } from './checkins.types.js';

export async function createCheckIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const input = req.body as CreateCheckInInput;

    const checkIn = await createOrUpdateCheckIn(userId, input);

    res.status(200).json({
      success: true,
      data: checkIn,
    });
  } catch (err) {
    next(err);
  }
}
