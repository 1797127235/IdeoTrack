import { api } from "./api";

export type ReportScope = "school" | "college" | "class";

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

export const getDashboardStats = () =>
  api.get<DashboardStats>("/reports/dashboard");

export const getMultiDimStats = (params: {
  scope: ReportScope;
  scopeId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.set("scope", params.scope);
  if (params.scopeId) searchParams.set("scopeId", params.scopeId);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  return api.get<MultiDimStats[]>(`/reports/stats?${searchParams.toString()}`);
};
