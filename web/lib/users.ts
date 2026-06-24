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
export const listUsers = () => api.get<User[]>("/users");
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
