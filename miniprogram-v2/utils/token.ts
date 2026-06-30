/**
 * Token 存储
 */

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_user_role';

export function getToken(): string | null {
  try {
    return wx.getStorageSync(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  wx.setStorageSync(TOKEN_KEY, token);
}

export function clearToken(): void {
  try {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(ROLE_KEY);
  } catch {
    // ignore
  }
}

export function getRole(): string | null {
  try {
    return wx.getStorageSync(ROLE_KEY) || null;
  } catch {
    return null;
  }
}

export function setRole(role: string): void {
  wx.setStorageSync(ROLE_KEY, role);
}
