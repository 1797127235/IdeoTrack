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

export type StudentFilterStatus = 'all' | 'checked_in' | 'absent';

export interface SendRemindersInput {
  student_ids: string[];
  date?: string;
}

export interface SendRemindersSummary {
  total: number;
  sent: number;
  skipped_no_openid: number;
  already_reminded: number;
  failed: number;
}

export type ReminderStatus = 'sent' | 'failed' | 'skipped_no_openid' | 'already_reminded';

export interface ReminderRecord {
  reminder_id: string;
  student_id: string;
  student_name: string;
  student_school_id: string;
  status: ReminderStatus;
  error_message: string | null;
  created_at: string;
}

export interface ClassReminderList {
  class_id: string;
  date: string;
  reminders: ReminderRecord[];
}

/**
 * 导出打卡数据的请求输入（FR-24）。
 * class_ids：辅导员所带班级（后端逐个校验归属）；
 * start_date / end_date：YYYY-MM-DD，start <= end，跨度上限 90 天。
 */
export interface ExportCheckInsInput {
  class_ids: string[];
  start_date: string;
  end_date: string;
}

/**
 * 导出任务结果（返回给前端）。
 * download_url：签名下载端点（不经过 JWT authenticate，靠 token 自校验）；
 * expires_at：链接失效时间（ISO 8601，默认 24h，AD-7）。
 */
export interface ExportJobResult {
  download_url: string;
  expires_at: string;
}

/**
 * 导出查询的行类型（内部使用，映射 Excel 一行）。
 */
export interface ExportRowItem {
  class_name: string;
  student_name: string;
  student_school_id: string;
  task_title: string;
  checked_in_at: string;
  check_in_status: string;
  reflection_content: string;
}
