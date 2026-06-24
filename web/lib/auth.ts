import { api, setToken, removeToken } from "./api";

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
  const { token, user } = await api.post<{ token: string; user: AuthUser }>(
    "/auth/login",
    credentials
  );
  setToken(token);
  return user;
}

export async function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/auth/me");
}

export function logout(): void {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("ideo_token");
}
