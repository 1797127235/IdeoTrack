import type { Request, Response, NextFunction } from 'express';
import { getClassLeaderboard, getCollegeLeaderboard, getSchoolLeaderboard } from './leaderboard.service.js';

export async function getClassLeaderboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED', message: '未认证' } });
      return;
    }
    const data = await getClassLeaderboard(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCollegeLeaderboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED', message: '未认证' } });
      return;
    }
    const data = await getCollegeLeaderboard(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSchoolLeaderboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED', message: '未认证' } });
      return;
    }
    const data = await getSchoolLeaderboard(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
