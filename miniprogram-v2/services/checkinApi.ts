import { post, get, API_BASE_URL, ApiResponse } from './api';
import { getToken, clearToken } from '../utils/token';

export interface CreateCheckInData {
  task_id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  reflection_content?: string;
}

export interface CheckInResponse {
  id: string;
  task_id: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  checked_in_at: string;
  reflection_content: string | null;
  ai_review_reason: string | null;
  reflection_modified: boolean;
  face_photo_path?: string | null;
  face_verified?: boolean | null;
  face_similarity?: number | null;
}

export interface CheckInResultSummary {
  check_in_id: string;
  task_id: string;
  task_title: string;
  status: string;
  reflection_content: string | null;
  base_points: number;
  streak_days: number;
  next_level_progress: number;
  earned_badge: '坚持一周' | '坚持一月' | null;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: Array<{
    day: string;
    checked_in: boolean;
    status?: string;
    reflection_content?: string | null;
    task_title?: string | null;
  }>;
}

export interface ReverseGeocodeResult {
  address: string;
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
  township: string;
  street: string;
  number: string;
}

export async function reverseGeocode(lat: number, lng: number) {
  return get<ReverseGeocodeResult>(`/api/checkins/reverse-geocode?lat=${lat}&lng=${lng}`);
}

export async function createCheckIn(data: CreateCheckInData) {
  return post<CheckInResponse>('/api/checkins', data);
}

export function createCheckInWithPhoto(
  data: CreateCheckInData,
  photoPath: string
): Promise<ApiResponse<CheckInResponse>> {
  return new Promise((resolve, reject) => {
    const formData: WechatMiniprogram.IAnyObject = { task_id: data.task_id };
    if (data.reflection_content) formData.reflection_content = data.reflection_content;
    if (data.latitude !== undefined) formData.latitude = String(data.latitude);
    if (data.longitude !== undefined) formData.longitude = String(data.longitude);
    if (data.address) formData.address = data.address;

    const header: WechatMiniprogram.IAnyObject = {};
    const token = getToken();
    if (token) header.Authorization = `Bearer ${token}`;

    wx.uploadFile({
      url: `${API_BASE_URL}/api/checkins`,
      filePath: photoPath,
      name: 'photo',
      formData,
      header,
      timeout: 30000,
      success: (res) => {
        if (res.statusCode === 401) {
          clearToken();
        }

        try {
          const parsed = JSON.parse(res.data) as ApiResponse<CheckInResponse>;
          if (parsed && typeof parsed === 'object' && 'success' in parsed) {
            resolve(parsed);
            return;
          }
        } catch {
          // ignore
        }

        if (res.statusCode >= 400) {
          reject(new Error(`上传失败（${res.statusCode}），请稍后重试`));
          return;
        }

        reject(new Error('上传响应异常，请重试'));
      },
      fail: (err) => {
        const errMsg = err.errMsg || '';
        if (errMsg.includes('timeout')) {
          reject(new Error('人脸验证超时，请重试'));
          return;
        }
        reject(new Error(errMsg || '网络请求失败'));
      },
    });
  });
}

export async function submitReflection(checkInId: string, content: string) {
  return post<CheckInResponse>(`/api/checkins/${checkInId}/reflection`, { content });
}

export async function getCheckInResult(checkInId: string) {
  return get<CheckInResultSummary>(`/api/checkins/${checkInId}/result`);
}

export async function getStudentCalendar(year: number, month: number) {
  return get<CalendarMonth>(`/api/checkins/calendar?year=${year}&month=${month}`);
}
