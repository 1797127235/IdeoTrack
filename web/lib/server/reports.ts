import { serverApi } from "../server-api";
import type { DashboardStats } from "../types/reports";

export type { DashboardStats };

export const getDashboardStats = () =>
  serverApi.get<DashboardStats>("/reports/dashboard");
