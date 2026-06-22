import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  return data as ApiResponse<T>;
}

export async function login(schoolId: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ schoolId, password }),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '登录失败');
  }

  await SecureStore.setItemAsync('auth_token', result.data.token);
  return result.data;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}
