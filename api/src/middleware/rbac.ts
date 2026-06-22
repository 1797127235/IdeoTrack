import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';
import type { UserRole } from '../domains/auth/auth.types.js';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('AUTH_UNAUTHORIZED', '未认证', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('ACCESS_DENIED', '无权访问该资源', 403));
    }

    next();
  };
}
