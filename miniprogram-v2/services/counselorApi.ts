import { get, post } from './api';

export interface CounselorClass {
  class_id: string;
  class_name: string;
  college_name: string;
}

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

export interface CounselorTaskDashboardItem {
  task_id: string;
  title: string;
  deadline_at: string;
  classes: ClassDashboardItem[];
}

export interface CounselorTaskDashboard {
  tasks: CounselorTaskDashboardItem[];
}

export interface CheckInTrendItem {
  date: string;
  checked_count: number;
  total_students: number;
  rate: number;
}

export interface CheckInTrend {
  days: number;
  items: CheckInTrendItem[];
}

export interface TaskCheckInStudent {
  student_id: string;
  student_name: string;
  student_school_id: string;
  class_id: string;
  class_name: string;
}

export interface TaskCheckInCheckedStudent extends TaskCheckInStudent {
  status: string;
  checked_in_at: string | null;
}

export interface TaskCheckInClassStats {
  class_id: string;
  class_name: string;
  total_students: number;
  checked_count: number;
  absent_count: number;
  check_in_rate: number;
}

export interface TaskCheckInDetail {
  task: {
    id: string;
    title: string;
    content: string;
    deadline_at: string;
    checkin_type: string;
    require_location: boolean;
    require_face: boolean;
  };
  classes: TaskCheckInClassStats[];
  checked_students: TaskCheckInCheckedStudent[];
  absent_students: TaskCheckInStudent[];
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

export interface ClassRankingItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_count: number;
  completion_rate: number;
}

export interface ClassTaskStat {
  task_id: string;
  title: string;
  deadline_at: string;
  total_students: number;
  checked_count: number;
  review_count: number;
  completion_rate: number;
}

export interface ClassStudentSummary {
  student_id: string;
  student_name: string;
  student_school_id: string;
  total_tasks: number;
  completed_count: number;
  review_count: number;
  completion_rate: number;
}

export interface ClassDetail {
  class_id: string;
  class_name: string;
  college_name: string;
  student_count: number;
  tasks: ClassTaskStat[];
  students: ClassStudentSummary[];
}

export interface ClassStudentList {
  class_id: string;
  class_name: string;
  task_id: string;
  students: ClassStudentItem[];
}

export async function getCounselorClasses(): Promise<CounselorClass[]> {
  const result = await get<CounselorClass[]>('/api/counselor/classes');
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取班级列表失败');
  }
  return result.data;
}

export async function getCounselorDashboard(
  classId?: string,
  startDate?: string,
  endDate?: string
): Promise<CounselorTaskDashboard> {
  let url = '/api/counselor/dashboard';
  const params: string[] = [];
  if (classId) params.push(`classId=${classId}`);
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  const result = await get<CounselorTaskDashboard>(url);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取辅导员看板失败');
  }
  return result.data;
}

export async function getCheckInTrend(days = 7, classId?: string): Promise<CheckInTrend> {
  let url = `/api/counselor/checkin-trend?days=${days}`;
  if (classId) url += `&classId=${classId}`;
  const result = await get<CheckInTrend>(url);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取打卡趋势失败');
  }
  return result.data;
}

export async function getTaskCheckInDetail(taskId: string): Promise<TaskCheckInDetail> {
  const result = await get<TaskCheckInDetail>(`/api/counselor/tasks/${taskId}/checkins`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取任务打卡详情失败');
  }
  return result.data;
}

export async function getClassStudents(
  classId: string,
  taskId: string,
  status: 'all' | 'checked_in' | 'absent' = 'all'
): Promise<ClassStudentList> {
  const result = await get<ClassStudentList>(
    `/api/counselor/classes/${classId}/students?task_id=${taskId}&status=${status}`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取班级学生列表失败');
  }
  return result.data;
}

export async function sendReminders(classId: string, taskId: string, studentIds: string[]) {
  return post(`/api/counselor/classes/${classId}/reminders`, {
    task_id: taskId,
    student_ids: studentIds,
  });
}

export async function exportCheckIns(classIds: string[], startDate: string, endDate: string) {
  return post<{ download_url: string; expires_at: string }>('/api/counselor/exports', {
    class_ids: classIds,
    start_date: startDate,
    end_date: endDate,
  });
}

export async function exportTaskCheckIns(taskId: string): Promise<{ download_url: string; expires_at: string }> {
  const result = await get<{ download_url: string; expires_at: string }>(`/api/counselor/tasks/${taskId}/checkins/export`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '导出失败');
  }
  return result.data;
}

export async function getClassRanking(
  startDate?: string,
  endDate?: string
): Promise<ClassRankingItem[]> {
  let url = '/api/counselor/ranking';
  const params: string[] = [];
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  const result = await get<ClassRankingItem[]>(url);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取班级排行失败');
  }
  return result.data;
}

export interface ReportExportInput {
  period: 'week' | 'month' | 'custom';
  start_date?: string;
  end_date?: string;
  class_id?: string | null;
  report_type: 'summary' | 'class' | 'student';
  format: 'pdf' | 'excel';
}

export async function exportReport(input: ReportExportInput): Promise<{ download_url: string; expires_at: string }> {
  const result = await post<{ download_url: string; expires_at: string }>('/api/counselor/reports/export', input);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '导出报告失败');
  }
  return result.data;
}

export async function getClassDetail(classId: string): Promise<ClassDetail> {
  const result = await get<ClassDetail>(`/api/counselor/classes/${classId}/detail`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取班级详情失败');
  }
  return result.data;
}
