import { get } from './api';

export interface ClassDashboardItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
  absent_count: number;
}

export interface DashboardSummary {
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
}

export interface CounselorDashboard {
  date: string;
  classes: ClassDashboardItem[];
  summary: DashboardSummary;
}

export interface ClassStudentItem {
  student_id: string;
  student_name: string;
  student_school_id: string;
  checked_in: boolean;
  checked_in_at: string | null;
  status: string | null;
  reflection_content: string | null;
  consecutive_absent_days: number;
}

export interface ClassStudentList {
  class_id: string;
  class_name: string;
  date: string;
  students: ClassStudentItem[];
}

export type StudentFilterStatus = 'all' | 'checked_in' | 'absent';

/**
 * 获取辅导员所带班级的今日打卡概览。
 * @param date 可选日期（YYYY-MM-DD），默认服务端今日
 */
export async function getCounselorDashboard(date?: string): Promise<CounselorDashboard> {
  const path = date ? `/api/counselor/dashboard?date=${encodeURIComponent(date)}` : '/api/counselor/dashboard';
  const res = await get<CounselorDashboard>(path);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取班级概览失败');
  }
  return res.data;
}

/**
 * 获取某班级学生的当日打卡名单。
 */
export async function getClassStudentList(
  classId: string,
  status: StudentFilterStatus = 'all',
  date?: string
): Promise<ClassStudentList> {
  const queryParts: string[] = [`status=${encodeURIComponent(status)}`];
  if (date) queryParts.push(`date=${encodeURIComponent(date)}`);
  const res = await get<ClassStudentList>(`/api/counselor/classes/${classId}/students?${queryParts.join('&')}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取学生名单失败');
  }
  return res.data;
}
