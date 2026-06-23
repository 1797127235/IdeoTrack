/**
 * API 客户端 —— 镜像 mobile/services/api.ts。
 *
 * 差异：Web 端用 localStorage 存 token（mobile 用 expo-secure-store）。
 * 后端零改动：复用同一套 /api/auth/* 接口与 {success,data,error} 信封。
 *
 * 401 处理：非登录/改密接口收到 401 → 清 token（由调用方负责跳转 /login）。
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 10000;
const TOKEN_KEY = "auth_token";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface LoginUser {
  id: string;
  role: "student" | "counselor" | "admin";
  isInitialPassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: LoginUser;
}

/** 读取本地 token（同步，浏览器环境） */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 统一请求方法。
 * @throws Error(message 为后端中文消息或网络错误)
 */
export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 401 且非登录/改密接口 → 清 token 并跳 /login（AC-8）
    if (
      response.status === 401 &&
      !path.startsWith("/api/auth/login") &&
      !path.startsWith("/api/auth/change-password")
    ) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) {
      // 避免把整段 HTML（如 Caddy 502 页）当作错误信息展示
      const statusText = `请求失败: ${response.status}`;
      if (!contentType.includes("application/json")) {
        throw new Error(statusText);
      }
      const text = await response.text();
      throw new Error(text || statusText);
    }

    const data = (await response.json()) as ApiResponse<T>;
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接");
    }
    // 网络错误（离线 / DNS 失败）给出中文兜底
    if (err instanceof TypeError) {
      throw new Error("网络连接失败，请检查网络");
    }
    throw err;
  }
}

/** 管理员登录：账号 + 密码 */
export async function login(
  schoolId: string,
  password: string
): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ schoolId: schoolId.trim(), password }),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "登录失败");
  }

  setToken(result.data.token);
  return result.data;
}

/** 修改密码 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const result = await request<null>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!result.success) {
    throw new Error(result.error?.message || "修改密码失败");
  }
}

/** 登出：清 token */
export function logout(): void {
  clearToken();
}
