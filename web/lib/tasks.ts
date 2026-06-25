import { api } from "./api";

export type TaskScopeType = "school" | "college" | "class" | "pool";
export type TaskStatus = "published" | "delisted";

export interface Task {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  scope_type: TaskScopeType;
  scope_id: string | null;
  target_college_id: string | null;
  target_class_id: string | null;
  source_task_id: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  published_at: string;
  deadline_at: string;
  status: TaskStatus;
  created_at: string;
  scope_label?: string;
  total_assignees?: number;
  completed_count?: number;
  completion_rate?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  scopeType?: TaskScopeType;
  page?: number;
  limit?: number;
}

export interface ListTasksResponse {
  items: Task[];
  total: number;
  page: number;
  limit: number;
}

export const listTasks = (filters: TaskFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.scopeType) params.set("scope_type", filters.scopeType);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/tasks?${query}` : "/tasks";
  return api.get<ListTasksResponse>(path);
};

export const getTask = (id: string) => api.get<Task>(`/tasks/${id}`);
export const createTask = (data: {
  title: string;
  content: string;
  guiding_questions?: string[];
  source_url?: string;
  video_url?: string;
  scope_type: TaskScopeType;
  scope_id?: string;
  target_college_id?: string;
  target_class_id?: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  published_at: string;
  deadline_at: string;
}) => api.post<Task>("/tasks", data);
export const updateTask = (
  id: string,
  data: Partial<{
    title: string;
    content: string;
    guiding_questions: string[] | null;
    source_url: string | null;
    video_url: string | null;
    scope_type: TaskScopeType;
    scope_id: string | null;
    target_college_id: string | null;
    target_class_id: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
    geo_radius_meters: number | null;
    geo_address: string | null;
    published_at: string;
    deadline_at: string;
    status: TaskStatus;
  }>
) => api.put<Task>(`/tasks/${id}`, data);
export const delistTask = (id: string) =>
  api.patch<Task>(`/tasks/${id}/delist`, {});

export function scopeLabel(task: Task): string {
  if (task.scope_label) return task.scope_label;
  const map: Record<TaskScopeType, string> = {
    school: "全校",
    college: "学院",
    class: "班级",
    pool: "任务池",
  };
  return map[task.scope_type] || task.scope_type;
}

export function statusLabel(status: TaskStatus): string {
  return status === "published" ? "进行中" : "已下架";
}
