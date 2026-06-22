/**
 * Token 存储 — 替代 mobile 端的 expo-secure-store。
 * 小程序用 wx.getStorageSync 同步存储。
 */

const TOKEN_KEY = 'auth_token';

/** 获取当前 token（同步） */
export function getToken(): string | null {
  try {
    return wx.getStorageSync(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

/** 存储 token */
export function setToken(token: string): void {
  wx.setStorageSync(TOKEN_KEY, token);
}

/** 清除 token */
export function clearToken(): void {
  try {
    wx.removeStorageSync(TOKEN_KEY);
  } catch {
    // 忽略
  }
}
