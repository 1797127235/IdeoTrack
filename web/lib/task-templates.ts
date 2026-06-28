import { api } from "./api";

export type TaskTemplateStatus = "published" | "delisted";

export interface TaskTemplate {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
  created_by: string;
  status: TaskTemplateStatus;
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

export const createTaskTemplate = (data: {
  title: string;
  content: string;
  guiding_questions?: string[];
  source_url?: string;
  video_url?: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
}) => api.post<TaskTemplate>("/task-templates", data);

export const updateTaskTemplate = (
  id: string,
  data: Partial<{
    title: string;
    content: string;
    guiding_questions: string[] | null;
    source_url: string | null;
    video_url: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
    geo_radius_meters: number | null;
    geo_address: string | null;
    require_face: boolean;
    status: TaskTemplateStatus;
  }>
) => api.put<TaskTemplate>(`/task-templates/${id}`, data);

export const delistTaskTemplate = (id: string) =>
  api.patch<TaskTemplate>(`/task-templates/${id}/delist`, {});

export const deleteTaskTemplate = (id: string) =>
  api.delete(`/task-templates/${id}`);
