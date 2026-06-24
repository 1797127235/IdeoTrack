import { get, post } from './api';

export interface ClassDashboardItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
  absent_count: number;
  reminded_count: number;
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
  reminded: boolean;
}

export interface ClassStudentList {
  class_id: string;
  class_name: string;
  date: string;
  students: ClassStudentItem[];
}

export interface SendRemindersSummary {
  total: number;
  sent: number;
  skipped_no_openid: number;
  already_reminded: number;
  failed: number;
}

export interface ReminderRecord {
  reminder_id: string;
  student_id: string;
  student_name: string;
  student_school_id: string;
  status: 'sent' | 'failed' | 'skipped_no_openid' | 'already_reminded';
  error_message: string | null;
  created_at: string;
}

export interface ClassReminderList {
  class_id: string;
  date: string;
  reminders: ReminderRecord[];
}

export type StudentFilterStatus = 'all' | 'checked_in' | 'absent';

export interface ExportCheckInsInput {
  class_ids: string[];
  start_date: string;
  end_date: string;
}

export interface ExportJobResult {
  download_url: string;
  expires_at: string;
}

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

/**
 * 向指定班级的学生批量发送一键提醒。
 */
export async function sendReminders(
  classId: string,
  studentIds: string[],
  date?: string
): Promise<SendRemindersSummary> {
  const body: { student_ids: string[]; date?: string } = { student_ids: studentIds };
  if (date) body.date = date;
  const res = await post<SendRemindersSummary>(`/api/counselor/classes/${classId}/reminders`, body);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '发送提醒失败');
  }
  return res.data;
}

/**
 * 获取某班级在指定日期的提醒记录列表。
 */
export async function getClassReminders(classId: string, date?: string): Promise<ClassReminderList> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await get<ClassReminderList>(`/api/counselor/classes/${classId}/reminders${query}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取提醒记录失败');
  }
  return res.data;
}

/**
 * 导出辅导员所带班级的打卡数据为 Excel（FR-24）。
 * 返回签名下载链接（24h 有效），辅导员复制到浏览器下载（AD-17）。
 */
export async function exportCheckIns(input: ExportCheckInsInput): Promise<ExportJobResult> {
  const res = await post<ExportJobResult>('/api/counselor/exports', input);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '导出失败');
  }
  return res.data;
}
