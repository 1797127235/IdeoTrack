import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

const MIGRATION_SQL = `
-- 确保 pgcrypto 扩展可用（Supabase 默认启用，但独立 Postgres 需要显式创建）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 学院表
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (college_id, name)
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'counselor', 'admin')),
  is_initial_password BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 辅导员班级关联表（一个辅导员可带多个班）
CREATE TABLE IF NOT EXISTS counselor_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (counselor_id, class_id)
);

-- 更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 微信 openid 字段（学生微信登录绑定，AD-17）
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
DROP INDEX IF EXISTS idx_users_wechat_openid;
CREATE UNIQUE INDEX idx_users_wechat_openid ON users(wechat_openid) WHERE wechat_openid IS NOT NULL;

-- 名言库
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author TEXT,
  source TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 每日名言记录
CREATE TABLE IF NOT EXISTS daily_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_quotes_is_enabled ON quotes(is_enabled);
CREATE INDEX IF NOT EXISTS idx_quotes_display_order ON quotes(display_order);
CREATE INDEX IF NOT EXISTS idx_daily_quotes_date ON daily_quotes(date);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('school', 'college', 'class')),
  target_college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'delisted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_task_scope CHECK (
    (scope_type = 'school' AND target_college_id IS NULL AND target_class_id IS NULL) OR
    (scope_type = 'college' AND target_college_id IS NOT NULL AND target_class_id IS NULL) OR
    (scope_type = 'class' AND target_college_id IS NULL AND target_class_id IS NOT NULL)
  )
);

-- 打卡记录表（Epic 3 最小版本，Epic 4 扩展定位与心得）
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'ai_reviewing', 'ai_approved', 'pending_manual_review', 'approved', 'rejected', 'requires_modification')),
  latitude DECIMAL(10, 8) NOT NULL DEFAULT 0,
  longitude DECIMAL(11, 8) NOT NULL DEFAULT 0,
  address TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NOT NULL DEFAULT 0;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NOT NULL DEFAULT 0;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS reflection_content TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS ai_review_reason TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS reflection_modified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS review_feedback TEXT;

-- 积分记录表（Epic 5.3 / AD-13）：打卡通过时原子发放积分
CREATE TABLE IF NOT EXISTS point_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (check_in_id)
);

CREATE INDEX IF NOT EXISTS idx_point_records_user_id ON point_records(user_id);

-- AI 初审记录表（Epic 5.1）：保存每次 AI 审核输入、结果与原因，支持审计与调优
CREATE TABLE IF NOT EXISTS ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reflection_content TEXT NOT NULL,
  task_content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ai_approved', 'pending_manual_review')),
  reason TEXT,
  reason_code TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_check_in_id ON ai_reviews(check_in_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_user_id ON ai_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_status ON ai_reviews(status);

-- 为历史数据兼容设置默认值；新记录必须由 API 提供真实坐标。
-- V2 数据清理后可移除默认值：
-- ALTER TABLE check_ins ALTER COLUMN latitude DROP DEFAULT;
-- ALTER TABLE check_ins ALTER COLUMN longitude DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_check_ins_reflection_status ON check_ins(status, reflection_modified);

CREATE INDEX IF NOT EXISTS idx_tasks_status_deadline ON tasks(status, deadline_at);
CREATE INDEX IF NOT EXISTS idx_tasks_published_at ON tasks(published_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scope ON tasks(scope_type, target_college_id, target_class_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_task_user ON check_ins(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_check_ins_updated_at ON check_ins;
CREATE TRIGGER update_check_ins_updated_at
  BEFORE UPDATE ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');

    console.log('Migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
