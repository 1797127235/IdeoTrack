import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import type { LoginInput, LoginResponse, User, UserRole, ChangePasswordInput } from './auth.types.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 64;
const BCRYPT_SALT_ROUNDS = 10;

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
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'], noTimestamp: true }
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

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword.trim();

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AppError('AUTH_WEAK_PASSWORD', `新密码长度不能少于 ${MIN_PASSWORD_LENGTH} 位`, 400);
  }

  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new AppError('AUTH_WEAK_PASSWORD', `新密码长度不能超过 ${MAX_PASSWORD_LENGTH} 位`, 400);
  }

  if (newPassword === currentPassword) {
    throw new AppError('AUTH_SAME_PASSWORD', '新密码不能与当前密码相同', 400);
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new AppError('AUTH_SERVICE_ERROR', '用户查询失败', 500);
  }

  if (typeof user.password_hash !== 'string' || !user.password_hash) {
    throw new AppError('AUTH_SERVICE_ERROR', '用户凭据数据异常', 500);
  }

  const currentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!currentValid) {
    throw new AppError('AUTH_INVALID_PASSWORD', '当前密码错误', 401);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  const { data: updatedUsers, error: updateError } = await supabase
    .from('users')
    .update({
      password_hash: newPasswordHash,
      is_initial_password: false,
    })
    .eq('id', userId)
    .select('id');

  if (updateError || !updatedUsers || updatedUsers.length === 0) {
    throw new AppError('AUTH_SERVICE_ERROR', '密码更新失败', 500);
  }
}
