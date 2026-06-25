import { serverApi } from "../server-api";
import type { DashboardStats, MultiDimStats, ReportScope } from "../types/reports";

export type { DashboardStats, MultiDimStats, ReportScope };

export const getDashboardStats = () =>
  serverApi.get<DashboardStats>("/reports/dashboard");

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
  return serverApi.get<MultiDimStats[]>(`/reports/stats?${searchParams.toString()}`);
};
