export type UserRole = 'student' | 'counselor' | 'admin';

export interface User {
  id: string;
  school_id: string;
  role: UserRole;
  password_hash: string;
  is_initial_password: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginInput {
  schoolId: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    role: UserRole;
    isInitialPassword: boolean;
  };
}
