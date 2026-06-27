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
  directCollegeId: string | null;
  collegeName: string | null;
  className: string | null;
  hasFace: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  keyword?: string;
  role?: UserRole;
  classId?: string;
  collegeId?: string;
  isEnabled?: boolean;
  hasFace?: boolean;
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
  collegeId?: string;
  classId?: string;
  isEnabled?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  collegeId?: string | null;
  classId?: string | null;
  isEnabled?: boolean;
}

export interface BatchImportUserInput {
  users: Array<{
    schoolId: string;
    name?: string;
    role: UserRole;
    collegeId?: string;
    classId?: string;
  }>;
}

export interface BatchImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

// ===== Batch Import Organizations =====

export interface BatchImportOrgRow {
  collegeName: string;
  className?: string;
}

export interface BatchImportOrgResultItem {
  /** CSV 行号（从 2 开始，1 为表头）。 */
  row: number;
  collegeName: string;
  className?: string;
  status: 'created' | 'skipped' | 'failed';
  message?: string;
}

export interface BatchImportOrgResult {
  created: number;
  skipped: number;
  failed: number;
  /** 学院名称 -> 已知 id 缓存（幂等去重用）。 */
  items: BatchImportOrgResultItem[];
}

export interface Counselor {
  id: string;
  schoolId: string;
  name: string | null;
}

export interface ManagedClass {
  id: string;
  name: string;
  collegeId: string;
  collegeName: string;
}

export interface SetManagedClassesInput {
  classIds: string[];
}

// ===== Face =====

export interface UserFace {
  id: string;
  userId: string;
  photoPath: string;
  hasEmbedding: boolean;
  createdAt: string;
}

/** 批量导入注册照的单条结果。row 为 zip 内文件名。 */
export interface BatchFaceImportItem {
  row: string;
  schoolId: string;
  status: 'success' | 'skipped' | 'failed';
  message?: string;
}

export interface BatchFaceImportResult {
  success: number;
  skipped: number;
  failed: number;
  items: BatchFaceImportItem[];
}

/** 批量注册照导入异步任务（前端轮询用）。 */
export interface FaceImportJob {
  id: string;
  status: 'pending' | 'running' | 'done';
  total: number;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  items: BatchFaceImportItem[];
  startedAt: string;
  finishedAt: string | null;
}
