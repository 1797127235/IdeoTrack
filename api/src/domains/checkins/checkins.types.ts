export type CheckInStatus =
  | 'submitted'
  | 'ai_reviewing'
  | 'ai_approved'
  | 'pending_manual_review'
  | 'approved'
  | 'rejected'
  | 'requires_modification';

export interface CheckIn {
  id: string;
  task_id: string;
  user_id: string;
  status: CheckInStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  checked_in_at: string;
  reflection_content: string | null;
  ai_review_reason: string | null;
  review_feedback: string | null;
  reflection_modified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckInResponse {
  id: string;
  task_id: string;
  status: CheckInStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  checked_in_at: string;
  reflection_content: string | null;
  ai_review_reason: string | null;
  ai_review_reason_code?: string;
  review_feedback: string | null;
  reflection_modified: boolean;
}

export interface CreateCheckInInput {
  task_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  reflection_content?: string;
}

export interface SubmitReflectionInput {
  check_in_id: string;
  content: string;
}

export interface CheckInResultSummary {
  check_in_id: string;
  task_id: string;
  task_title: string;
  status: CheckInStatus;
  reflection_content: string | null;
  base_points: number;
  streak_days: number;
  next_level_progress: number;
  earned_badge: '坚持一周' | '坚持一月' | null;
}

export interface CalendarDay {
  day: string; // YYYY-MM-DD
  checked_in: boolean;
  status?: CheckInStatus;
  reflection_content?: string | null;
  task_title?: string | null;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface StudyRecordItem {
  id: string;
  taskId: string;
  taskTitle: string;
  status: CheckInStatus;
  checkedInAt: string;
  reflectionContent: string | null;
  points: number;
}

export interface StudyRecordsResult {
  items: StudyRecordItem[];
  total: number;
  page: number;
  limit: number;
}
