import { post, get, API_BASE_URL, type ApiResponse } from './api';
import { getToken, clearToken } from '../utils/token';

export interface CreateCheckInData {
  task_id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  reflection_content?: string;
}

export interface SubmitReflectionData {
  content: string;
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

export interface CalendarDay {
  day: string;
  checked_in: boolean;
  status?: string;
  reflection_content?: string | null;
  task_title?: string | null;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
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

/**
 * 携带现场照的人脸打卡提交。
 * 用 wx.uploadFile 走 multipart/form-data：照片作为 file 字段，
 * 其余文本字段放进 formData。后端用 multer 接收并做人脸比对。
 *
 * @param data   文本字段（task_id/latitude/longitude/address/reflection_content）
 * @param photoPath  wx.chooseMedia 返回的临时文件路径
 */
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
      timeout: 30000, // 人脸比对可能较慢，放宽到 30s
      success: (res) => {
        try {
          const parsed = JSON.parse(res.data) as ApiResponse<CheckInResponse>;
          // 401 时清除 token（与 request 封装行为一致）
          if (res.statusCode === 401) {
            clearToken();
          }
          resolve(parsed);
        } catch {
          reject(new Error(`打卡失败 (${res.statusCode})`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

export async function submitReflection(checkInId: string, content: string) {
  return post<CheckInResponse>(`/api/checkins/${checkInId}/reflection`, {
    content,
  });
}

export async function getCheckInResult(checkInId: string) {
  return get<CheckInResultSummary>(`/api/checkins/${checkInId}/result`);
}

export async function getStudentCalendar(year: number, month: number) {
  return get<CalendarMonth>(`/api/checkins/calendar?year=${year}&month=${month}`);
}
