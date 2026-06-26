import { redirect } from "next/navigation";
import {
  getMultiDimStats,
  type MultiDimStats,
  type ReportScope,
} from "@/lib/server/reports";
import {
  listCollegesServer,
  listClassesServer,
  type College,
  type Class,
} from "@/lib/server/users";
import { ServerApiError } from "@/lib/server-api";
import { EmptyState } from "@/components/ui";
import { AlertCircle } from "lucide-react";
import ReportsFilterForm from "./ReportsFilterForm";

interface ReportsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const scope = (params.scope as ReportScope) || "school";
  const scopeId = typeof params.scopeId === "string" ? params.scopeId : "";
  const startDate = typeof params.startDate === "string" ? params.startDate : "";
  const endDate = typeof params.endDate === "string" ? params.endDate : "";

  let stats: MultiDimStats[];
  let colleges: College[];
  let classes: Class[];
  try {
    [stats, colleges, classes] = await Promise.all([
      getMultiDimStats({
        scope,
        scopeId: scopeId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
      listCollegesServer(),
      listClassesServer(),
    ]);
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 401) {
      redirect("/login");
    }
    return (
      <EmptyState
        title={err instanceof Error ? err.message : "加载失败"}
        description="请刷新页面或稍后重试"
        icon={<AlertCircle className="w-6 h-6 text-[var(--color-ink-muted)]" />}
      />
    );
  }

  return (
    <ReportsFilterForm
      initialStats={stats}
      colleges={colleges}
      classes={classes}
      initialScope={scope}
      initialScopeId={scopeId}
      initialStartDate={startDate}
      initialEndDate={endDate}
    />
  );
}
