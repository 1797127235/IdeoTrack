import { api } from "./api";

export type TaskScopeType = "school" | "college" | "class";
export type TaskStatus = "published" | "delisted";
export type TaskCategory = "学习" | "实践" | "活动" | "会议" | "阅读";
export type CheckinType = "text" | "image" | "video" | "mixed";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  content: string;
  cover_image: string | null;
  category: TaskCategory | null;
  tags: string[] | null;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  checkin_type: CheckinType;
  require_text: boolean;
  require_image: boolean;
  require_video: boolean;
  min_text_length: number | null;
  max_images: number | null;
  require_location: boolean;
  scope_type: TaskScopeType;
  scope_id: string | null;
  target_college_id: string | null;
  target_class_id: string | null;
  template_id: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
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

export interface CreateTaskData {
  title: string;
  description?: string | null;
  content: string;
  cover_image?: string | null;
  category?: TaskCategory | null;
  tags?: string[] | null;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  checkin_type?: CheckinType;
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
  min_text_length?: number | null;
  max_images?: number | null;
  require_location?: boolean;
  scope_type: TaskScopeType;
  scope_id?: string | null;
  target_college_id?: string;
  target_class_id?: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  published_at: string;
  deadline_at: string;
}

export const createTask = (data: CreateTaskData) => api.post<Task>("/tasks", data);

export const createTaskFromTemplate = (data: {
  template_id: string;
  scope_type: TaskScopeType;
  scope_id?: string | null;
  target_class_ids?: string[];
  published_at: string;
  deadline_at: string;
}) => api.post<Task[]>("/tasks/from-template", data);

export const updateTask = (id: string, data: Partial<CreateTaskData>) =>
  api.put<Task>(`/tasks/${id}`, data);

export const delistTask = (id: string) =>
  api.patch<Task>(`/tasks/${id}/delist`, {});

export function scopeLabel(task: Task): string {
  if (task.scope_label) return task.scope_label;
  const map: Record<TaskScopeType, string> = {
    school: "全校",
    college: "学院",
    class: "班级",
  };
  return map[task.scope_type] || task.scope_type;
}

export function statusLabel(status: TaskStatus): string {
  return status === "published" ? "进行中" : "已下架";
}

export function checkinTypeLabel(type: CheckinType): string {
  const map: Record<CheckinType, string> = {
    text: "文字心得",
    image: "图片上传",
    video: "视频上传",
    mixed: "图文混合",
  };
  return map[type];
}

export function categoryLabel(category: TaskCategory | null): string {
  return category || "未分类";
}
