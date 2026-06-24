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

// ===== 微信登录（Story 12.3，AD-17）=====

export interface WechatLoginInput {
  /** wx.login 返回的临时 code */
  code: string;
}

export interface WechatLoginResponse {
  /** true = openid 未绑定，需走绑定流程 */
  needBind: boolean;
  /** 未绑定时返回 openid，前端透传给绑定接口 */
  openid?: string;
  /** 已绑定时返回的 JWT */
  token?: string;
  user?: LoginResponse['user'];
}

export interface WechatBindInput {
  /** 微信 openid（由登录接口透传） */
  openid: string;
  /** 学号 */
  schoolId: string;
  /** 密码 */
  password: string;
}

export interface MeResponse {
  userId: string;
  role: UserRole;
  name: string | null;
  schoolId: string;
  managedClassesCount: number;
  collegeName: string | null;
}

/** 微信 code2session 接口返回 */
export interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}
