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

const validRoles: UserRole[] = ['student', 'counselor', 'admin'];

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = req.cookies?.token;
  if (typeof cookieToken === 'string' && cookieToken) {
    return cookieToken;
  }

  return null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('AUTH_UNAUTHORIZED', '未提供有效的认证令牌', 401));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId?: unknown; role?: unknown };

    if (typeof payload.userId !== 'string' || !payload.userId) {
      return next(new AppError('AUTH_UNAUTHORIZED', '认证令牌载荷无效', 401));
    }

    if (typeof payload.role !== 'string' || !validRoles.includes(payload.role as UserRole)) {
      return next(new AppError('AUTH_UNAUTHORIZED', '认证令牌角色无效', 401));
    }

    req.user = { userId: payload.userId, role: payload.role as UserRole };
    next();
  } catch {
    next(new AppError('AUTH_UNAUTHORIZED', '认证令牌无效或已过期', 401));
  }
}
