import { setToken, clearToken } from './token';

/**
 * 登录态辅助函数 — 登录成功/退出的统一入口。
 * 替代把方法挂在 App 实例上的做法（App 标准类型不支持自定义方法）。
 */

/** 登录成功后调用：保存 token */
export function onLoginSuccess(token: string): void {
  setToken(token);
}

/** 退出登录：清 token + 跳回登录页 */
export function logout(): void {
  clearToken();
  wx.reLaunch({ url: '/pages/auth/login/index' });
}
