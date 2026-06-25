export type ReportScope = 'school' | 'college' | 'class';

// 口径：任务驱动。围绕"当前进行中的任务"统计，而非"今日按天"。
// "已完成打卡" = status IN ('ai_approved','approved')（学生"打完卡"宽视角，
// 区别于任务列表的 completion_rate 仅算 'approved' 的人工终审窄口径）。
export interface DashboardStats {
  // 4 张 KPI 卡
  activeTaskCount: number;        // 进行中任务数（status='published' 且当前在 published_at/deadline_at 窗口内）
  pendingCompletionCount: number; // 活跃任务下尚未"完成打卡"的学生人次（应打 - 已打）
  todayCheckInCount: number;      // 今日新增的有效打卡数（status <> 'rejected'）
  totalCompletedCount: number;    // 系统累计完成打卡数（ai_approved+approved，不限时间/任务）

  // 学院完成率排行（基于活跃任务的应打卡/已完成人次）
  collegeRanking: Array<{
    id: string;
    name: string;
    totalAssignees: number; // 该学院在活跃任务下的应打卡人次
    completedCount: number; // 已完成（ai_approved+approved）人次
    completionRate: number; // 完成率 %
  }>;

  // 当前活跃任务下尚未完成打卡的学生（按截止时间升序，优先展示最紧迫的）
  pendingStudents: Array<{
    id: string;
    name: string | null;
    schoolId: string;
    collegeName: string | null;
    className: string | null;
    taskId: string;
    taskTitle: string;    // 关联的任务名（告诉管理员"哪个任务没交"）
    taskDeadline: string; // 截止时间（判断紧迫度）
  }>;

  // 近 12 天每日有效打卡趋势（真实数据）
  dailyCheckInTrend: Array<{
    date: string;        // 'YYYY-MM-DD'
    checkInCount: number;
  }>;
}

export interface MultiDimStats {
  scope: ReportScope;
  scopeId: string | null;
  scopeName: string | null;
  totalStudents: number;
  checkInCount: number;
  checkInRate: number;
  absentCount: number;
  reflectionCount: number;
  aiApprovedCount: number;
  aiReviewCount: number;
  manualReviewCount: number;
  manualApprovedCount: number;
  manualRejectedCount: number;
}

export interface StatsFilters {
  scope: ReportScope;
  scopeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportRequest {
  format: 'excel' | 'pdf';
  scope: ReportScope;
  scopeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportResult {
  downloadUrl: string;
  expiresAt: string;
}
