import { getToken, clearToken } from '../utils/token';

/**
 * API 基础封装 — 镜像 mobile/services/api.ts，但用 wx.request。
 *
 * 开发环境：
 *   - 本地后端默认 http://localhost:3000，微信开发者工具需勾选
 *     「不校验合法域名」（project.config.json 已设 urlCheck: false）
 *   - 上线前需在小程序后台配置业务域名（API 域名 + ICP 备案）
 *
 * 切换环境：修改 API_BASE_URL 常量即可。
 */

const API_BASE_URL = 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 10000;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** wx.request 的 Promise 化封装 */
function rawRequest<T>(
  path: string,
  options: { method?: HttpMethod; data?: unknown } = {}
): Promise<{ statusCode: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data as string | WechatMiniprogram.IAnyObject | undefined,
      timeout: REQUEST_TIMEOUT_MS,
      header: buildHeaders(),
      success: (res) => {
        resolve({ statusCode: res.statusCode, data: res.data });
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

/** 构建请求头：Content-Type + JWT */
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

/**
 * 统一请求方法。
 * - 自动注入 JWT
 * - 401 时清除 token（除非是登录/绑定接口本身）
 * - 非 success 响应或网络错误时抛出 Error（message 为后端中文消息）
 */
export async function request<T>(
  path: string,
  options: { method?: HttpMethod; data?: unknown } = {}
): Promise<ApiResponse<T>> {
  try {
    const { statusCode, data } = await rawRequest<T>(path, options);

    // 401 且非登录类接口 → 清除本地 token
    if (statusCode === 401 && !path.startsWith('/api/auth/')) {
      clearToken();
    }

    // 后端返回 application/json 且成功解析 ApiResponse
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>;
    }

    // 非 JSON 或解析失败
    throw new Error(`请求失败: ${statusCode}`);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('请求失败');
  }
}

/** 便捷方法：GET */
export function get<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'GET' });
}

/** 便捷方法：POST */
export function post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'POST', data });
}

/** 便捷方法：PUT */
export function put<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'PUT', data });
}
