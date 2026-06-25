import { api } from "./api";

export type UserRole = "student" | "counselor" | "admin";

export interface AuthUser {
  id: string;
  role: UserRole;
  isInitialPassword: boolean;
}

export interface MeResponse {
  userId: string;
  role: UserRole;
  name: string | null;
  schoolId: string;
  managedClassesCount: number;
  collegeName: string | null;
}

export interface LoginCredentials {
  schoolId: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const { user } = await api.post<{ token: string; user: AuthUser }>(
    "/auth/login",
    credentials
  );
  return user;
}

export async function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/auth/me");
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.post<null>("/auth/change-password", input);
}

export async function logout(): Promise<void> {
  try {
    await api.post<null>("/auth/logout", {});
  } catch {
    // best-effort: 即使服务端登出失败，也继续由调用方处理跳转
  }
}
