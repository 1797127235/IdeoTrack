import { post, get } from './api';

export interface CreateCheckInData {
  task_id: string;
  latitude?: number;
  longitude?: number;
  address?: string;
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

export async function createCheckIn(data: CreateCheckInData) {
  return post<CheckInResponse>('/api/checkins', data);
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
