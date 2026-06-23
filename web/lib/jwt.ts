/**
 * JWT 解码 —— 纯客户端 base64 解 payload，不验签（验签在后端）。
 * 镜像 mobile/utils/jwt.ts，浏览器原生有 atob。
 */
export type UserRole = "student" | "counselor" | "admin";

export interface JwtPayload {
  userId?: string;
  role?: UserRole;
  exp?: number;
  iat?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(base64 + padding);

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/** token 是否存在且未过期（防御 exp 非数字） */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 > Date.now();
}
