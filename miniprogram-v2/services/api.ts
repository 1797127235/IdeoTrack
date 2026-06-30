import { getToken, clearToken } from '../utils/token';

export function getApiBaseUrl(): string {
  try {
    const app = getApp<{ globalData: { apiBaseUrl?: string } }>();
    return app?.globalData?.apiBaseUrl || 'http://192.168.46.96:3000';
  } catch {
    return 'http://192.168.46.96:3000';
  }
}

export const API_BASE_URL = getApiBaseUrl();

const REQUEST_TIMEOUT_MS = 10000;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

function rawRequest<T>(
  path: string,
  options: { method?: HttpMethod; data?: unknown } = {}
): Promise<{ statusCode: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}${path}`,
      method: options.method || 'GET',
      data: options.data as string | WechatMiniprogram.IAnyObject | undefined,
      timeout: REQUEST_TIMEOUT_MS,
      header: buildHeaders(),
      success: (res) => {
        resolve({ statusCode: res.statusCode, data: res.data });
      },
      fail: (err) => {
        const msg = err.errMsg || '';
        if (msg.includes('connection refused') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
          reject(new Error('无法连接到后端服务，请确认本地服务已启动 (localhost:3000)'));
          return;
        }
        reject(new Error(msg || '网络请求失败'));
      },
    });
  });
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function request<T>(
  path: string,
  options: { method?: HttpMethod; data?: unknown } = {}
): Promise<ApiResponse<T>> {
  const { statusCode, data } = await rawRequest<T>(path, options);

  if (statusCode === 401 && !path.startsWith('/api/auth/')) {
    clearToken();
  }

  if (data && typeof data === 'object' && 'success' in data) {
    const res = data as ApiResponse<T>;
    if (!res.success) {
      const message = res.error?.message || '请求失败';
      throw new Error(message);
    }
    return res;
  }

  if (statusCode === 403) {
    throw new Error('无权访问该资源，请确认当前账号角色是否正确');
  }

  throw new Error(`请求失败: ${statusCode}`);
}

export function get<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'POST', data });
}

export function put<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'PUT', data });
}

export function patch<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'PATCH', data });
}
