export interface ClassDashboardItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
  absent_count: number;
  reminded_count: number;
  pending_review_count: number;
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

export interface ClassRankingItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_count: number;
  completion_rate: number;
}

export interface CounselorDashboardFilters {
  classId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CheckInTrendFilters {
  days?: number;
  classId?: string;
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

export type StudentFilterStatus = 'all' | 'checked_in' | 'absent';

export interface SendRemindersInput {
  student_ids: string[];
  task_id: string;
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
  class_name: string;
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

/**
 * 近 N 天打卡趋势数据点。
 */
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

export type ReportPeriod = 'week' | 'month' | 'custom';
export type ReportType = 'summary' | 'class' | 'student';
export type ReportFormat = 'pdf' | 'excel';

export interface ReportExportInput {
  period: ReportPeriod;
  start_date?: string;
  end_date?: string;
  class_id?: string | null;
  report_type: ReportType;
  format: ReportFormat;
}

export interface DashboardReportData {
  meta: {
    title: string;
    scopeLabel: string;
    startDate: string;
    endDate: string;
    exportedAt: string;
    counselorName: string;
  };
  overview: {
    managedClassCount: number;
    totalStudents: number;
    totalTasks: number;
    avgCompletionRate: number;
    pendingReviewCount: number;
    incompleteStudentCount: number;
  };
  classStats: Array<{
    rank: number;
    classId: string;
    className: string;
    collegeName: string;
    studentCount: number;
    checkedCount: number;
    incompleteCount: number;
    pendingReviewCount: number;
    completionRate: number;
  }>;
  taskStats: Array<{
    taskId: string;
    title: string;
    scope: string;
    deadline: string;
    totalStudents: number;
    checkedCount: number;
    completionRate: number;
    pendingReviewCount: number;
    incompleteCount: number;
  }>;
  highRiskStudents: Array<{
    studentId: string;
    studentName: string;
    studentSchoolId: string;
    className: string;
    absentCount: number;
    totalTasks: number;
    absentRate: number;
  }>;
  studentDetails: Array<{
    studentId: string;
    studentName: string;
    studentSchoolId: string;
    classId: string;
    className: string;
    totalTasks: number;
    completedCount: number;
    reviewCount: number;
    incompleteCount: number;
    completionRate: number;
  }>;
}
