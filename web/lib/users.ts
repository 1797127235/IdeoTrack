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
}

export interface UserFilters {
  keyword?: string;
  role?: UserRole;
  classId?: string;
  collegeId?: string;
  isEnabled?: boolean;
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
  classId?: string;
}) => api.post<User>("/users", data);
export const updateUser = (
  id: string,
  data: {
    name?: string;
    role?: UserRole;
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
  classId?: string;
}> }) => api.post<{ success: number; failed: number; errors: Array<{ row: number; message: string }> }>("/users/batch-import", data);

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    student: "学生",
    counselor: "辅导员",
    admin: "管理员",
  };
  return map[role];
}
