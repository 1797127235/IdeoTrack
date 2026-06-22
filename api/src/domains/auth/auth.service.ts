import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import type { LoginInput, LoginResponse, User, UserRole } from './auth.types.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function login(input: LoginInput): Promise<LoginResponse> {
  const normalizedSchoolId = input.schoolId.trim();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('school_id', normalizedSchoolId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new AppError('AUTH_INVALID_CREDENTIALS', '账号或密码错误', 401);
    }
    throw new AppError('AUTH_SERVICE_ERROR', '登录服务异常，请稍后重试', 500);
  }

  if (!user) {
    throw new AppError('AUTH_INVALID_CREDENTIALS', '账号或密码错误', 401);
  }

  const now = new Date();
  const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;

  if (lockedUntil && !Number.isNaN(lockedUntil.getTime()) && lockedUntil > now) {
    throw new AppError(
      'AUTH_ACCOUNT_LOCKED',
      `账号已锁定，请 ${LOCK_DURATION_MINUTES} 分钟后重试`,
      403
    );
  }

  if (typeof user.password_hash !== 'string' || !user.password_hash) {
    throw new AppError('AUTH_SERVICE_ERROR', '用户凭据数据异常', 500);
  }

  const passwordValid = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordValid) {
    const newFailedAttempts = user.failed_login_attempts + 1;
    const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

    const updatePayload: {
      failed_login_attempts: number;
      locked_until?: string;
    } = {
      failed_login_attempts: newFailedAttempts,
    };

    if (shouldLock) {
      const lockUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);
      updatePayload.locked_until = lockUntil.toISOString();
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError) {
      throw new AppError('AUTH_SERVICE_ERROR', '登录服务异常，请稍后重试', 500);
    }

    throw new AppError('AUTH_INVALID_CREDENTIALS', '账号或密码错误', 401);
  }

  // Reset failed attempts and lock status on successful login
  const { error: resetError } = await supabase
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', user.id);

  if (resetError) {
    throw new AppError('AUTH_SERVICE_ERROR', '登录服务异常，请稍后重试', 500);
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role as UserRole },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  return {
    token,
    user: {
      id: user.id,
      role: user.role as UserRole,
      isInitialPassword: user.is_initial_password,
    },
  };
}
