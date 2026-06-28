import { api } from "./api";

export type TaskTemplateStatus = "draft" | "published" | "delisted";
export type TaskTemplateCategory = "学习" | "实践" | "活动" | "会议" | "阅读";
export type CheckinType = "text" | "image" | "video" | "mixed";

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  content: string;
  cover_image: string | null;
  category: TaskTemplateCategory | null;
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
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
  created_by: string;
  status: TaskTemplateStatus;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateFilters {
  status?: TaskTemplateStatus;
  page?: number;
  limit?: number;
}

export interface ListTaskTemplatesResponse {
  items: TaskTemplate[];
  total: number;
  page: number;
  limit: number;
}

export const listTaskTemplates = (filters: TaskTemplateFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/task-templates?${query}` : "/task-templates";
  return api.get<ListTaskTemplatesResponse>(path);
};

export const getTaskTemplate = (id: string) => api.get<TaskTemplate>(`/task-templates/${id}`);

export interface CreateTaskTemplateData {
  title: string;
  description?: string | null;
  content: string;
  cover_image?: string | null;
  category?: TaskTemplateCategory | null;
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
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  status?: TaskTemplateStatus;
  start_time?: string | null;
  end_time?: string | null;
}

export const createTaskTemplate = (data: CreateTaskTemplateData) =>
  api.post<TaskTemplate>("/task-templates", data);

export const updateTaskTemplate = (id: string, data: Partial<CreateTaskTemplateData>) =>
  api.put<TaskTemplate>(`/task-templates/${id}`, data);

export const delistTaskTemplate = (id: string) =>
  api.patch<TaskTemplate>(`/task-templates/${id}/delist`, {});

export const deleteTaskTemplate = (id: string) =>
  api.delete(`/task-templates/${id}`);

export function statusLabel(status: TaskTemplateStatus): string {
  const map: Record<TaskTemplateStatus, string> = {
    draft: "草稿",
    published: "已发布",
    delisted: "已下架",
  };
  return map[status];
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

export function categoryLabel(category: TaskTemplateCategory | null): string {
  return category || "未分类";
}
