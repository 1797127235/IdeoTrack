/**
 * Web 公共 API 客户端
 * - 依赖后端 httpOnly Cookie 认证（fetch credentials: include）
 * - 统一错误处理
 * - 适配后端标准响应格式 { success, data, error }
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "ApiClientError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  // 处理 HTTP 级别错误（如 500、网络错误等）
  if (!response.ok && response.status !== 401) {
    let errorBody: ApiResponse<unknown> | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // ignore
    }
    throw new ApiClientError(
      errorBody?.error?.code || "HTTP_ERROR",
      errorBody?.error?.message || `请求失败: ${response.status}`,
      response.status
    );
  }

  // 401 时后端可能不返回 JSON，需要特殊处理
  if (response.status === 401) {
    let message = "登录已过期，请重新登录";
    let code = "AUTH_UNAUTHORIZED";
    try {
      const errorBody = (await response.json()) as ApiResponse<unknown>;
      if (errorBody.error) {
        code = errorBody.error.code;
        message = errorBody.error.message;
      }
    } catch {
      // ignore
    }
    throw new ApiClientError(code, message, 401);
  }

  const result = (await response.json()) as ApiResponse<T>;

  if (!result.success) {
    throw new ApiClientError(
      result.error?.code || "UNKNOWN_ERROR",
      result.error?.message || "请求失败",
      response.status
    );
  }

  return result.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
