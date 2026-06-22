declare const atob: (input: string) => string;

export interface JwtPayload {
  userId?: string;
  role?: 'student' | 'counselor' | 'admin';
  exp?: number;
  iat?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(base64 + padding);

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}
