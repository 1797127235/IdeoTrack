import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      if (key === 'SUPABASE_URL') return 'http://localhost:54321';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-role-key';
      if (key === 'JWT_SECRET') return 'test-jwt-secret-at-least-32-characters-long';
      if (key === 'CLIENT_URL') return '*';
      return `test-${key.toLowerCase()}`;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  const port = parseInt(raw || '3000', 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
}

const jwtSecret = requireEnv('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const config = {
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: requireEnv('CLIENT_URL'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // 微信小程序（AD-17 学生端登录）。开发期可不配，配了才支持微信登录。
  wechatAppId: process.env.WECHAT_APP_ID || '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET || '',
};
