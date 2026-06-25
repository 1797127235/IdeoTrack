export type UserRole = 'student' | 'counselor' | 'admin';

export interface College {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  collegeId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  collegeName?: string;
}

export interface User {
  id: string;
  schoolId: string;
  name: string | null;
  role: UserRole;
  isEnabled: boolean;
  isInitialPassword: boolean;
  classId: string | null;
  collegeId: string | null;
  collegeName: string | null;
  className: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  keyword?: string;
  role?: UserRole;
  classId?: string;
  collegeId?: string;
  isEnabled?: boolean;
}

export interface ListUsersResult {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCollegeInput {
  name: string;
}

export interface UpdateCollegeInput {
  name: string;
}

export interface CreateClassInput {
  collegeId: string;
  name: string;
}

export interface UpdateClassInput {
  collegeId?: string;
  name: string;
}

export interface CreateUserInput {
  schoolId: string;
  name?: string;
  role: UserRole;
  classId?: string;
  isEnabled?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  classId?: string | null;
  isEnabled?: boolean;
}

export interface BatchImportUserInput {
  users: Array<{
    schoolId: string;
    name?: string;
    role: UserRole;
    classId?: string;
  }>;
}

export interface BatchImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}
