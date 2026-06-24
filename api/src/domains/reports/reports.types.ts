export type ReportScope = 'school' | 'college' | 'class';

export interface DashboardStats {
  todayCheckInRate: number;
  todayCheckInCount: number;
  todayTotalStudents: number;
  todayAbsentCount: number;
  totalStudents: number;
  totalCheckIns: number;
  totalReflections: number;
  collegeRanking: Array<{
    id: string;
    name: string;
    rate: number;
    checkInCount: number;
    totalStudents: number;
  }>;
  recentAbsentStudents: Array<{
    id: string;
    name: string | null;
    schoolId: string;
    collegeName: string | null;
    className: string | null;
    consecutiveAbsentDays: number;
    lastCheckInDate: string | null;
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
