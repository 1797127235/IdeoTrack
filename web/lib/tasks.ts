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
  published_at: string;
  deadline_at: string;
  status: TaskStatus;
  created_at: string;
  scope_label?: string;
  total_assignees?: number;
  completed_count?: number;
  completion_rate?: number;
}

export const listTasks = () => api.get<Task[]>("/tasks");
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
