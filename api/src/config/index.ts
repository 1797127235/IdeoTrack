import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      if (key === 'DATABASE_URL') {
        const testUrl = process.env.TEST_DATABASE_URL;
        if (testUrl) return testUrl;
        return 'postgresql://postgres:postgres@localhost:5432/ideo_track_test';
      }
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

const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = nodeEnv !== 'production';

export const config = {
  port: parsePort(process.env.PORT),
  nodeEnv,
  isDev,
  clientUrl: requireEnv('CLIENT_URL'),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // 微信小程序（AD-17 学生端登录）。开发期可不配，配了才支持微信登录。
  wechatAppId: process.env.WECHAT_APP_ID || '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET || '',
  // 微信小程序订阅消息模板 ID（Epic 8.3 一键提醒）。开发期可不配。
  wechatReminderTemplateId: process.env.WECHAT_REMINDER_TEMPLATE_ID || '',
  // 日志：级别 + 文件目录
  //   LOG_LEVEL 不设时，dev=debug（最详细），prod=info
  //   LOG_FILE_DIR 不设时，dev 写 ./logs，prod 仅 stdout（docker logs）
  logLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  logFileDir: process.env.LOG_FILE_DIR || '',
  // 导出文件（AD-7）：本地临时文件目录 + 签名下载链接有效期。
  //   EXPORT_FILE_DIR 不设时，默认写进程工作目录下的 ./exports（dev/test）。
  //   生产环境通过 docker-compose 挂载 ./exports:/app/exports 卷持久化。
  //   EXPORT_LINK_TTL_SECONDS 不设时，默认 86400（24h，AD-7）。
  exportFileDir: process.env.EXPORT_FILE_DIR || '',
  exportLinkTtlSeconds: Number(process.env.EXPORT_LINK_TTL_SECONDS) || 86400,
  // 人脸识别微服务（FastAPI + InsightFace）。
  //   容器间用服务名 http://face:8000；本地开发直接跑 python app.py 时用 http://localhost:8000。
  //   开发期可不配，配了才支持人脸比对。
  faceServiceUrl: process.env.FACE_SERVICE_URL || '',
};
