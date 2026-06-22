import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 10000;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    role: 'student' | 'counselor' | 'admin';
    isInitialPassword: boolean;
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await SecureStore.getItemAsync('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
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

    if (response.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(text || `请求失败: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse<T>;
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw err;
  }
}

export async function login(schoolId: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ schoolId: schoolId.trim(), password }),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '登录失败');
  }

  await SecureStore.setItemAsync('auth_token', result.data.token);
  return result.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const result = await request<null>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!result.success) {
    throw new Error(result.error?.message || '修改密码失败');
  }
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}
