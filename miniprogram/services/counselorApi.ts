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

export interface CounselorTaskDashboardItem {
  task_id: string;
  title: string;
  deadline_at: string;
  classes: ClassDashboardItem[];
}

export interface CounselorTaskDashboard {
  tasks: CounselorTaskDashboardItem[];
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
  task_id: string;
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
  task_id: string;
  reminders: ReminderRecord[];
}

export interface HighRiskStudent {
  student_id: string;
  student_name: string;
  student_school_id: string;
  class_id: string;
  class_name: string;
  college_name: string;
  total_tasks: number;
  absent_count: number;
  absent_rate: number;
}

export interface HighRiskStudentList {
  window_size: number;
  absent_threshold: number;
  students: HighRiskStudent[];
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
 * 获取辅导员所辖班级中，最近 windowSize 个已截止任务里缺卡次数达到阈值的学生。
 */
export async function getHighRiskStudents(
  windowSize = 7,
  absentThreshold = 3
): Promise<HighRiskStudentList> {
  const res = await get<HighRiskStudentList>(
    `/api/counselor/high-risk-students?window_size=${windowSize}&absent_threshold=${absentThreshold}`
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取重点关注学生失败');
  }
  return res.data;
}

/**
 * 获取辅导员任务看板：列出可见任务及每个任务在所辖班级的完成情况。
 */
export async function getCounselorDashboard(): Promise<CounselorTaskDashboard> {
  const res = await get<CounselorTaskDashboard>('/api/counselor/dashboard');
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取任务看板失败');
  }
  return res.data;
}

/**
 * 获取某个任务在所辖班级的完成统计。
 */
export async function getTaskClassStats(taskId: string): Promise<CounselorTaskDashboardItem> {
  const res = await get<CounselorTaskDashboardItem>(`/api/counselor/tasks/${taskId}/classes`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取任务班级统计失败');
  }
  return res.data;
}

/**
 * 获取某班级学生在指定任务下的打卡名单。
 */
export async function getClassStudentList(
  classId: string,
  taskId: string,
  status: StudentFilterStatus = 'all'
): Promise<ClassStudentList> {
  const res = await get<ClassStudentList>(
    `/api/counselor/classes/${classId}/students?task_id=${encodeURIComponent(taskId)}&status=${encodeURIComponent(status)}`
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '获取学生名单失败');
  }
  return res.data;
}

/**
 * 向指定班级的学生批量发送一键提醒（按任务维度）。
 */
export async function sendReminders(
  classId: string,
  taskId: string,
  studentIds: string[]
): Promise<SendRemindersSummary> {
  const res = await post<SendRemindersSummary>(`/api/counselor/classes/${classId}/reminders`, {
    student_ids: studentIds,
    task_id: taskId,
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || '发送提醒失败');
  }
  return res.data;
}

/**
 * 获取某班级在指定任务下的提醒记录列表。
 */
export async function getClassReminders(classId: string, taskId: string): Promise<ClassReminderList> {
  const res = await get<ClassReminderList>(
    `/api/counselor/classes/${classId}/reminders?task_id=${encodeURIComponent(taskId)}`
  );
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
