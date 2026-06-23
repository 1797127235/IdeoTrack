import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../../lib/db.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  LoginInput,
  LoginResponse,
  User,
  UserRole,
  ChangePasswordInput,
  WechatLoginInput,
  WechatLoginResponse,
  WechatBindInput,
  WechatCode2SessionResponse,
} from './auth.types.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 64;
const BCRYPT_SALT_ROUNDS = 10;

export async function login(input: LoginInput): Promise<LoginResponse> {
  const normalizedSchoolId = input.schoolId.trim();

  const user = await queryOne<User>(
    'SELECT * FROM users WHERE school_id = $1 LIMIT 1',
    [normalizedSchoolId]
  );

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

    const lockedUntilIso = shouldLock
      ? new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
      : null;

    await query(
      `UPDATE users
       SET failed_login_attempts = $1,
           locked_until = $2
       WHERE id = $3`,
      [newFailedAttempts, lockedUntilIso, user.id]
    );

    throw new AppError('AUTH_INVALID_CREDENTIALS', '账号或密码错误', 401);
  }

  // Reset failed attempts and lock status on successful login
  await query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = $1`,
    [user.id]
  );

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

  const user = await queryOne<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );

  if (!user) {
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

  const result = await query(
    `UPDATE users
     SET password_hash = $1,
         is_initial_password = false
     WHERE id = $2
     RETURNING id`,
    [newPasswordHash, userId]
  );

  if (result.length === 0) {
    throw new AppError('AUTH_SERVICE_ERROR', '密码更新失败', 500);
  }
}

// ===== 微信登录（Story 12.3，AD-17）=====

/** 抽出 JWT 签发逻辑，供账号密码登录和微信登录复用 */
function signToken(user: { id: string; role: UserRole }): string {
  return jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    noTimestamp: true,
  });
}

/** 调用微信 code2session 接口，用 code 换 openid */
async function code2session(code: string): Promise<string> {
  if (!config.wechatAppId || !config.wechatAppSecret) {
    throw new AppError('AUTH_WECHAT_NOT_CONFIGURED', '微信登录未配置，请联系管理员', 500);
  }

  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(
    config.wechatAppId
  )}&secret=${encodeURIComponent(config.wechatAppSecret)}&js_code=${encodeURIComponent(
    code
  )}&grant_type=authorization_code`;

  let resp: Response;
  try {
    resp = await fetch(url);
  } catch {
    throw new AppError('AUTH_WECHAT_SERVICE_ERROR', '调用微信服务失败', 502);
  }

  if (!resp.ok) {
    throw new AppError('AUTH_WECHAT_SERVICE_ERROR', '微信服务不可用', 502);
  }

  const data = (await resp.json()) as WechatCode2SessionResponse;
  if (data.errcode || !data.openid) {
    throw new AppError('AUTH_WECHAT_CODE_INVALID', `微信登录凭证无效: ${data.errmsg || '未知错误'}`, 401);
  }
  return data.openid;
}

/** 微信登录：code → openid → 查绑定 → 签发 JWT 或返回 needBind */
export async function wechatLogin(input: WechatLoginInput): Promise<WechatLoginResponse> {
  if (!input.code || !input.code.trim()) {
    throw new AppError('VALIDATION_ERROR', '微信登录凭证不能为空', 400);
  }

  const openid = await code2session(input.code.trim());

  const user = await queryOne<{
    id: string;
    role: UserRole;
    is_initial_password: boolean;
    wechat_openid: string;
  }>(
    'SELECT id, role, is_initial_password, wechat_openid FROM users WHERE wechat_openid = $1 LIMIT 1',
    [openid]
  );

  // 已绑定 → 直接签发 JWT
  if (user && user.wechat_openid === openid) {
    const token = signToken({ id: user.id, role: user.role });
    return {
      needBind: false,
      token,
      user: {
        id: user.id,
        role: user.role,
        isInitialPassword: user.is_initial_password,
      },
    };
  }

  // 未绑定 → 返回 openid，前端引导走绑定流程
  return { needBind: true, openid };
}

/** 绑定学号：验证学号密码 → 把 openid 写入 users（旧绑定自动解绑） */
export async function bindWechat(input: WechatBindInput): Promise<LoginResponse> {
  const openid = input.openid.trim();
  const schoolId = input.schoolId.trim();

  if (!openid || !schoolId || !input.password) {
    throw new AppError('VALIDATION_ERROR', 'openid、学号、密码均不能为空', 400);
  }

  // 查用户（按学号）
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE school_id = $1 LIMIT 1',
    [schoolId]
  );

  if (!user || typeof user.password_hash !== 'string' || !user.password_hash) {
    throw new AppError('AUTH_INVALID_CREDENTIALS', '学号或密码错误', 401);
  }

  // 验证密码（不走账号锁定逻辑，绑定是首次场景，简化处理）
  const passwordValid = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordValid) {
    throw new AppError('AUTH_INVALID_CREDENTIALS', '学号或密码错误', 401);
  }

  // 仅学生角色可绑定（辅导员/管理员走 App，AD-17）
  if (user.role !== 'student') {
    throw new AppError('AUTH_WECHAT_ROLE_NOT_ALLOWED', '仅学生账号支持微信登录', 403);
  }

  // 先解绑占用该 openid 的旧账号（同一 openid 只能绑一个用户）
  await query(
    'UPDATE users SET wechat_openid = NULL WHERE wechat_openid = $1',
    [openid]
  );

  // 绑定到当前用户
  await query(
    'UPDATE users SET wechat_openid = $1 WHERE id = $2',
    [openid, user.id]
  );

  const token = signToken({ id: user.id, role: user.role });
  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      isInitialPassword: user.is_initial_password,
    },
  };
}
