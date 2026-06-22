import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './error-handler.js';
import type { UserRole } from '../domains/auth/auth.types.js';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('AUTH_UNAUTHORIZED', '未提供有效的认证令牌', 401));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string; role: UserRole };
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    next(new AppError('AUTH_UNAUTHORIZED', '认证令牌无效或已过期', 401));
  }
}
