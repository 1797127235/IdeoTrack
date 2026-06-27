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
