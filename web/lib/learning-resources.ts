const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export type LearningResourceType = "article" | "video" | "document" | "link";
export type LearningResourceStatus = "draft" | "published";

export interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  type: LearningResourceType;
  content: string | null;
  url: string | null;
  cover_url: string | null;
  category: string | null;
  tags: string[] | null;
  status: LearningResourceStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListLearningResourcesResponse {
  items: LearningResource[];
  total: number;
  page: number;
  limit: number;
}

export interface LearningResourceFilters {
  type?: LearningResourceType;
  category?: string;
  status?: LearningResourceStatus;
  page?: number;
  limit?: number;
}

export interface CreateLearningResourceData {
  title: string;
  description?: string;
  type: LearningResourceType;
  content?: string;
  url?: string;
  category?: string;
  tags?: string[];
  status?: LearningResourceStatus;
  cover?: File;
}

export interface UpdateLearningResourceData {
  title?: string;
  description?: string;
  type?: LearningResourceType;
  content?: string;
  url?: string;
  category?: string;
  tags?: string[];
  status?: LearningResourceStatus;
  cover?: File;
}

class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "ApiClientError";
  }
}

async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

async function requestMultipart<T>(
  method: "POST" | "PUT",
  path: string,
  data: Record<string, string | File | string[] | undefined>
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });

  const response = await fetch(url, {
    method,
    body: formData,
    credentials: "include",
  });

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok && response.status !== 401) {
    let errorBody: { error?: { code?: string; message?: string } } | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // ignore
    }
    throw new ApiClientError(
      errorBody?.error?.code || "HTTP_ERROR",
      errorBody?.error?.message || `请求失败: ${response.status}`,
      response.status
    );
  }

  if (response.status === 401) {
    throw new ApiClientError("AUTH_UNAUTHORIZED", "登录已过期，请重新登录", 401);
  }

  const result = (await response.json()) as { success: boolean; data?: T; error?: { code: string; message: string } };
  if (!result.success) {
    throw new ApiClientError(
      result.error?.code || "UNKNOWN_ERROR",
      result.error?.message || "请求失败",
      response.status
    );
  }

  return result.data as T;
}

export const listLearningResources = (filters: LearningResourceFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/learning-resources?${query}` : "/learning-resources";
  return requestJson<ListLearningResourcesResponse>("GET", path);
};

export const getLearningResource = (id: string) =>
  requestJson<LearningResource>("GET", `/learning-resources/${id}`);

export const createLearningResource = (data: CreateLearningResourceData) => {
  const { cover, ...rest } = data;
  return requestMultipart<LearningResource>("POST", "/learning-resources", { ...rest, cover });
};

export const updateLearningResource = (id: string, data: UpdateLearningResourceData) => {
  const { cover, ...rest } = data;
  return requestMultipart<LearningResource>("PUT", `/learning-resources/${id}`, { ...rest, cover });
};

export const updateLearningResourceStatus = (id: string, status: LearningResourceStatus) =>
  requestJson<LearningResource>("PATCH", `/learning-resources/${id}/status`, { status });

export const deleteLearningResource = (id: string) =>
  requestJson<null>("DELETE", `/learning-resources/${id}`);

export const getCoverUrl = (id: string) => `${API_BASE_URL}/learning-resources/${id}/cover`;

export function typeLabel(type: LearningResourceType): string {
  const map: Record<LearningResourceType, string> = {
    article: "文章",
    video: "视频",
    document: "文档",
    link: "链接",
  };
  return map[type];
}

export function statusLabel(status: LearningResourceStatus): string {
  return status === "published" ? "已发布" : "草稿";
}
