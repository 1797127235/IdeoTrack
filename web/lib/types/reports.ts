// 前后端共享的报表/统计类型。
// 与 api/src/domains/reports/reports.types.ts 保持一致，避免两端各自定义而漂移。

export type ReportScope = "school" | "college" | "class";

// Dashboard 口径：任务驱动。
// "已完成打卡" = ai_approved（AI 自动通过）+ approved（人工终审通过），
// 取学生"打完卡"宽视角；区别于任务列表 completion_rate（仅 approved）。
export interface DashboardStats {
  // 4 张 KPI 卡
  activeTaskCount: number;
  pendingCompletionCount: number;
  todayCheckInCount: number;
  totalCompletedCount: number;

  collegeRanking: Array<{
    id: string;
    name: string;
    totalAssignees: number;
    completedCount: number;
    completionRate: number;
  }>;

  pendingStudents: Array<{
    id: string;
    name: string | null;
    schoolId: string;
    collegeName: string | null;
    className: string | null;
    taskId: string;
    taskTitle: string;
    taskDeadline: string;
  }>;

  dailyCheckInTrend: Array<{
    date: string;
    checkInCount: number;
  }>;
}

// 多维度统计（报表导出页），口径与按范围聚合的打卡统计一致。
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
