import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login, changePassword } from './auth.service.js';
import { AppError } from '../../middleware/error-handler.js';

const loginSchema = z.object({
  schoolId: z.string().min(1, '学号/工号不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(1, '新密码不能为空').max(64, '新密码长度不能超过 64 位'),
});

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError('VALIDATION_ERROR', '请求参数无效', 400);
    }

    const result = await login(parseResult.data);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError('VALIDATION_ERROR', '请求参数无效', 400);
    }

    await changePassword(req.user.userId, parseResult.data);

    res.json({
      success: true,
      data: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('AUTH_UNAUTHORIZED', '未认证', 401);
    }

    res.json({
      success: true,
      data: {
        userId: req.user.userId,
        role: req.user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}
