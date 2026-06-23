import { post } from './api';

/** 微信登录返回：已登录直接发 token，未绑定需先绑定 */
export interface WechatLoginResponse {
  /** 是否需要绑定学号 */
  needBind: boolean;
  /** 未绑定时返回 openid，前端透传给绑定页 */
  openid?: string;
  /** 已绑定时返回的 JWT */
  token?: string;
  /** 已绑定时的用户信息 */
  user?: {
    id: string;
    role: 'student' | 'counselor' | 'admin';
    isInitialPassword: boolean;
  };
}

/** 绑定成功返回 JWT */
export interface BindResponse {
  token: string;
  user: {
    id: string;
    role: 'student' | 'counselor' | 'admin';
    isInitialPassword: boolean;
  };
}

/**
 * 微信登录（Story 12.2/12.3）
 * - 用 wx.login 拿 code
 * - 提交给后端，后端用 code 换 openid
 * - 已绑定 → 直接返回 token
 * - 未绑定 → 返回 { needBind: true }
 */
export async function wechatLogin(): Promise<WechatLoginResponse> {
  const { code } = await wxLogin();
  if (!code) {
    throw new Error('获取微信登录凭证失败');
  }

  const result = await post<WechatLoginResponse>('/api/auth/wechat/login', { code });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '微信登录失败');
  }
  return result.data;
}

/**
 * 账号密码登录（辅导员 / 管理员 / 未绑定微信的账号）
 * - 直接请求后端 POST /api/auth/login
 */
export async function loginWithPassword(
  schoolId: string,
  password: string
): Promise<BindResponse> {
  const result = await post<BindResponse>('/api/auth/login', {
    schoolId: schoolId.trim(),
    password,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '登录失败');
  }
  return result.data;
}

/**
 * 绑定账号（Story 12.2/12.3）
 * - 用户输入账号 + 密码
 * - 后端验证身份，把 openid 写入 users.wechat_openid
 * - 旧 openid 自动解绑
 */
export async function bindStudent(
  openid: string,
  schoolId: string,
  password: string
): Promise<BindResponse> {
  const result = await post<BindResponse>('/api/auth/wechat/bind', {
    openid,
    schoolId: schoolId.trim(),
    password,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '绑定失败');
  }
  return result.data;
}

/** wx.login 的 Promise 化 */
function wxLogin(): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg || '微信登录失败')),
    });
  });
}
