import { api } from "./api";

export type UserRole = "student" | "counselor" | "admin";

export interface College {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  collegeId: string;
  name: string;
  collegeName?: string;
}

export interface User {
  id: string;
  schoolId: string;
  name: string | null;
  role: UserRole;
  isEnabled: boolean;
  classId: string | null;
  collegeId: string | null;
  collegeName: string | null;
  className: string | null;
  hasFace: boolean;
}

export interface UserFilters {
  keyword?: string;
  role?: UserRole;
  classId?: string;
  collegeId?: string;
  isEnabled?: boolean;
  hasFace?: boolean;
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

// Colleges
export const listColleges = () => api.get<College[]>("/users/colleges");
export const createCollege = (data: { name: string }) =>
  api.post<College>("/users/colleges", data);
export const updateCollege = (id: string, data: { name: string }) =>
  api.put<College>(`/users/colleges/${id}`, data);
export const deleteCollege = (id: string) =>
  api.delete<{ id: string }>(`/users/colleges/${id}`);

// Classes
export const listClasses = () => api.get<Class[]>("/users/classes");
export const createClass = (data: { collegeId: string; name: string }) =>
  api.post<Class>("/users/classes", data);
export const updateClass = (id: string, data: { collegeId?: string; name: string }) =>
  api.put<Class>(`/users/classes/${id}`, data);
export const deleteClass = (id: string) =>
  api.delete<{ id: string }>(`/users/classes/${id}`);

// Users
export const listUsers = (filters: UserFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.role) params.set("role", filters.role);
  if (filters.classId) params.set("class_id", filters.classId);
  if (filters.collegeId) params.set("college_id", filters.collegeId);
  if (filters.isEnabled !== undefined) params.set("is_enabled", String(filters.isEnabled));
  if (filters.hasFace !== undefined) params.set("has_face", String(filters.hasFace));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/users?${query}` : "/users";
  return api.get<ListUsersResponse>(path);
};

export const createUser = (data: {
  schoolId: string;
  name?: string;
  role: UserRole;
  collegeId?: string;
  classId?: string;
}) => api.post<User>("/users", data);
export const updateUser = (
  id: string,
  data: {
    name?: string;
    role?: UserRole;
    collegeId?: string | null;
    classId?: string | null;
    isEnabled?: boolean;
  }
) => api.put<User>(`/users/${id}`, data);
export const deleteUser = (id: string) =>
  api.delete<{ id: string }>(`/users/${id}`);
export const batchImportUsers = (data: { users: Array<{
  schoolId: string;
  name?: string;
  role: UserRole;
  collegeId?: string;
  classId?: string;
}> }) => api.post<{ success: number; failed: number; errors: Array<{ row: number; message: string }> }>("/users/batch-import", data);

// 批量导入组织（学院 + 班级）
export interface BatchImportOrgResultItem {
  /** CSV 行号（从 2 开始，1 为表头）。 */
  row: number;
  collegeName: string;
  className?: string;
  status: "created" | "skipped" | "failed";
  message?: string;
}

export interface BatchImportOrgResult {
  created: number;
  skipped: number;
  failed: number;
  items: BatchImportOrgResultItem[];
}

export const batchImportOrganizations = (rows: Array<{ collegeName: string; className?: string }>) =>
  api.post<BatchImportOrgResult>("/users/batch-import-organizations", { rows });

// Counselor class assignments
export const listCounselors = () => api.get<Counselor[]>("/users/counselors");
export const getManagedClasses = (counselorId: string) =>
  api.get<ManagedClass[]>(`/users/${counselorId}/managed-classes`);
export const setManagedClasses = (counselorId: string, classIds: string[]) =>
  api.put<ManagedClass[]>(`/users/${counselorId}/managed-classes`, { classIds });

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    student: "学生",
    counselor: "辅导员",
    admin: "管理员",
  };
  return map[role];
}

// ===== Face（注册照）=====

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface UserFace {
  id: string;
  userId: string;
  photoPath: string;
  hasEmbedding: boolean;
  createdAt: string;
}

export interface BatchFaceImportResult {
  success: number;
  skipped: number;
  failed: number;
  items: Array<{
    row: string;
    schoolId: string;
    status: "success" | "skipped" | "failed";
    message?: string;
  }>;
}

/** 批量注册照导入异步任务（轮询用）。 */
export interface FaceImportJob {
  id: string;
  status: "pending" | "running" | "done";
  total: number;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  items: BatchFaceImportResult["items"];
  startedAt: string;
  finishedAt: string | null;
}

// multipart 上传不走通用 api 封装（那是 JSON），直接用 fetch + FormData
async function uploadMultipart(
  path: string,
  fieldName: string,
  file: File
): Promise<Response> {
  const form = new FormData();
  form.append(fieldName, file);
  return fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
}

// 单张上传注册照
export async function uploadUserFace(
  userId: string,
  photo: File
): Promise<UserFace> {
  const res = await uploadMultipart(`/users/${userId}/face`, "photo", photo);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "上传失败");
  }
  return json.data as UserFace;
}

// 删除注册照
export async function deleteUserFace(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/face`, {
    method: "DELETE",
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "删除失败");
  }
}

// 注册照图片预览 URL（img.src 直接用，带鉴权靠 cookie）
export function userFacePhotoUrl(userId: string): string {
  return `${API_BASE_URL}/users/${userId}/face/photo`;
}

// 批量 zip 导入注册照：创建异步 job，返回 jobId
export async function createFaceImportJob(zipFile: File): Promise<string> {
  const res = await uploadMultipart(`/users/batch-face-import`, "file", zipFile);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "导入失败");
  }
  return (json.data as { jobId: string }).jobId;
}

// 查询批量导入任务进度
export async function fetchFaceImportJob(jobId: string): Promise<FaceImportJob> {
  const res = await fetch(`${API_BASE_URL}/users/batch-face-import/${jobId}`, {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "查询进度失败");
  }
  return json.data as FaceImportJob;
}

// 查询某用户注册照（GET，单独实现）
export async function fetchUserFace(
  userId: string
): Promise<UserFace | null> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/face`, {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "查询失败");
  }
  return json.data as UserFace | null;
}

export interface Counselor {
  id: string;
  schoolId: string;
  name: string | null;
  collegeId: string | null;
  collegeName: string | null;
}

export interface ManagedClass {
  id: string;
  name: string;
  collegeId: string;
  collegeName: string;
}
