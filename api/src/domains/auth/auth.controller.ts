import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login } from './auth.service.js';
import { AppError } from '../../middleware/error-handler.js';

const loginSchema = z.object({
  schoolId: z.string().min(1, '学号/工号不能为空'),
  password: z.string().min(1, '密码不能为空'),
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
