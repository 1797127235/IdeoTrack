import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export class ServerApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "ServerApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokenCookie?.value) {
    headers["Cookie"] = `token=${tokenCookie.value}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    // Avoid Next.js caching server fetches by default; each request should be fresh.
    cache: "no-store",
  });

  if (!response.ok) {
    let errorBody: ApiResponse<unknown> | null = null;
    try {
      errorBody = (await response.json()) as ApiResponse<unknown>;
    } catch {
      // ignore
    }
    throw new ServerApiError(
      errorBody?.error?.code || "HTTP_ERROR",
      errorBody?.error?.message || `请求失败: ${response.status}`,
      response.status
    );
  }

  const result = (await response.json()) as ApiResponse<T>;

  if (!result.success) {
    throw new ServerApiError(
      result.error?.code || "UNKNOWN_ERROR",
      result.error?.message || "请求失败",
      response.status
    );
  }

  return result.data as T;
}

export const serverApi = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
