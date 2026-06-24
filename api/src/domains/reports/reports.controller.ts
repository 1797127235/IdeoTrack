import type { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service.js';
import { AppError } from '../../middleware/error-handler.js';

export async function getDashboardStatsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportsService.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMultiDimStatsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = req.query.scope as 'school' | 'college' | 'class';
    if (!scope || !['school', 'college', 'class'].includes(scope)) {
      next(new AppError('INVALID_SCOPE', 'scope 参数必须为 school/college/class 之一', 400));
      return;
    }

    const data = await reportsService.getMultiDimStats({
      scope,
      scopeId: req.query.scopeId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function exportReportController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportsService.exportReport(req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
