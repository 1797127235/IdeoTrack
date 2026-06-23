import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as Request & { id?: string }).id;

  if (err instanceof AppError) {
    // 业务错误（如 400/404/409）：记 warn 级别，便于发现高频错误
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        method: req.method,
        path: req.originalUrl || req.url,
        userId: req.user?.userId,
      },
      `AppError ${err.code}: ${err.message}`
    );
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // 未知错误：记 error 级别 + 完整堆栈，这是排查 bug 的关键
  logger.error(
    {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      userId: req.user?.userId,
      err: { message: err.message, stack: err.stack, name: err.name },
    },
    'Unhandled error'
  );
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
}
