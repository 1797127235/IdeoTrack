import { setToken, clearToken } from './token';

const USER_ROLE_KEY = 'auth_user_role';

/**
 * 登录态辅助函数 — 登录成功/退出的统一入口。
 * 替代把方法挂在 App 实例上的做法（App 标准类型不支持自定义方法）。
 */

export interface LoginUser {
  id: string;
  role: 'student' | 'counselor' | 'admin';
  isInitialPassword: boolean;
}

/** 登录成功后调用：保存 token 和角色信息 */
export function onLoginSuccess(token: string, user?: LoginUser): void {
  setToken(token);
  if (user) {
    wx.setStorageSync(USER_ROLE_KEY, user.role);
  }
}

/** 获取当前登录用户角色 */
export function getUserRole(): 'student' | 'counselor' | 'admin' | null {
  try {
    return wx.getStorageSync(USER_ROLE_KEY) || null;
  } catch {
    return null;
  }
}

/** 退出登录：清 token + 角色 + 跳回登录页 */
export function logout(): void {
  clearToken();
  try {
    wx.removeStorageSync(USER_ROLE_KEY);
  } catch {
    // 忽略
  }
  wx.reLaunch({ url: '/pages/auth/login/index' });
}
