import { get, post } from './api';

export interface WechatLoginResponse {
  needBind: boolean;
  openid?: string;
  token?: string;
  user?: {
    id: string;
    role: 'student' | 'counselor' | 'admin';
    isInitialPassword: boolean;
  };
}

export interface BindResponse {
  token: string;
  user: {
    id: string;
    role: 'student' | 'counselor' | 'admin';
    isInitialPassword: boolean;
  };
}

export async function wechatLogin(): Promise<WechatLoginResponse> {
  const { code } = await wxLogin();
  if (!code) {
    throw new Error('获取微信登录凭证失败');
  }

  const result = await post<WechatLoginResponse>('/api/auth/wechat/login', { code });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '微信登录失败');
  }
  return result.data;
}

export async function loginWithPassword(schoolId: string, password: string): Promise<BindResponse> {
  const result = await post<BindResponse>('/api/auth/login', {
    schoolId: schoolId.trim(),
    password,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '登录失败');
  }
  return result.data;
}

export async function bindStudent(openid: string, schoolId: string, password: string): Promise<BindResponse> {
  const result = await post<BindResponse>('/api/auth/wechat/bind', {
    openid,
    schoolId: schoolId.trim(),
    password,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '绑定失败');
  }
  return result.data;
}

export interface MeResponse {
  userId: string;
  role: 'student' | 'counselor' | 'admin';
  name: string | null;
  schoolId: string;
  managedClassesCount: number;
  collegeName: string | null;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
}

export interface LevelInfo {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number | null;
}

export interface MonthlyOverview {
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  currentStreak: number;
  maxStreak: number;
  reflections: number;
  points: number;
}

export interface WeeklyBarItem {
  day: string;
  label: string;
  completed: number;
}

export interface MeStatsResponse {
  points: number;
  level: LevelInfo;
  badges: Badge[];
  earnedBadgeCount: number;
  currentStreak: number;
  maxStreak: number;
  totalApproved: number;
  recent7Days: Array<{ date: string; checkedIn: boolean }>;
  monthly: MonthlyOverview;
  weekly: WeeklyBarItem[];
}

export async function getMe(): Promise<MeResponse> {
  const result = await get<MeResponse>('/api/auth/me');
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取用户信息失败');
  }
  return result.data;
}

export async function getMeStats(): Promise<MeStatsResponse> {
  const result = await get<MeStatsResponse>('/api/auth/me/stats');
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取用户统计失败');
  }
  return result.data;
}

function wxLogin(): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => resolve(res),
      fail: (err) => reject(new Error(err.errMsg || '微信登录失败')),
    });
  });
}
