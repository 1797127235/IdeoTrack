import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

/**
 * 请求日志中间件。
 *
 * 给每个请求注入：
 * - req.id：唯一请求 ID（用于排查时串联同一请求的多条日志）
 * - 响应完成后记录：method / path / status / 耗时 / userId
 *
 * 跳过 /health（避免健康检查刷屏）。
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  // 优先复用上游传入的 X-Request-Id，否则生成一个
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as Request & { id?: string }).id = requestId;
  res.setHeader('X-Request-Id', requestId);

  // 健康检查不打日志，避免噪音
  if (req.path === '/health') {
    next();
    return;
  }

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1e6;

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
        userId: req.user?.userId,
      },
      `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`
    );
  });

  next();
}
