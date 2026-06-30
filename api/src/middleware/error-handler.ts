import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
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

function normalizeUploadError(err: Error): AppError | null {
  if (err.name === 'MulterError') {
    const code = (err as Error & { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      return new AppError('UPLOAD_FILE_TOO_LARGE', '照片不能超过 5MB，请重新拍摄后上传', 413);
    }
    return new AppError('UPLOAD_INVALID_FILE', '照片上传失败，请重新拍摄后重试', 400);
  }

  if (err.message.includes('jpg/png/webp')) {
    return new AppError('UPLOAD_INVALID_TYPE', '仅支持 jpg、png、webp 格式照片', 400);
  }

  return null;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as Request & { id?: string }).id;
  const uploadError = normalizeUploadError(err);
  if (uploadError) {
    err = uploadError;
  }

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
  const errorResponse: Record<string, unknown> = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  };
  if (config.isDev) {
    errorResponse.error = {
      code: 'INTERNAL_ERROR',
      message: err.message,
      stack: err.stack,
      name: err.name,
    };
  }
  res.status(500).json(errorResponse);
}
