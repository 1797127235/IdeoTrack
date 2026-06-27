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
  is_enabled BOOLEAN NOT NULL DEFAULT true,
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

-- 用户表添加学院字段（与 class_id 保持一致，方便按学院查询）
ALTER TABLE users ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id);

-- 存量数据回刷：根据班级所属学院填充用户 college_id
UPDATE users u
SET college_id = c.college_id
FROM classes c
WHERE u.class_id = c.id AND u.college_id IS NULL;

-- 微信 openid 字段（学生微信登录绑定，AD-17）
ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;
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
  guiding_questions JSONB,  -- AD-22: 思考题数组，可选
  source_url TEXT,  -- AD-22: 外部链接，可选
  video_url TEXT,  -- AD-22: 视频 URL，可选
  scope_type TEXT NOT NULL CHECK (scope_type IN ('school', 'college', 'class', 'pool')),
  scope_id UUID,  -- AD-21: 统一的范围 ID（替代 target_college_id/target_class_id）
  target_college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  source_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- AD-21: 派发实例指向源任务
  geo_lat DECIMAL(10, 8),
  geo_lng DECIMAL(11, 8),
  geo_radius_meters INTEGER CHECK (geo_radius_meters BETWEEN 50 AND 1000),
  geo_address TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'delisted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_task_scope CHECK (
    (scope_type = 'school' AND target_college_id IS NULL AND target_class_id IS NULL) OR
    (scope_type = 'college' AND target_college_id IS NOT NULL AND target_class_id IS NULL) OR
    (scope_type = 'class' AND target_college_id IS NULL AND target_class_id IS NOT NULL) OR
    (scope_type = 'pool' AND target_college_id IS NULL AND target_class_id IS NULL)  -- AD-21: 任务池
  )
);

-- AD-21/AD-22: 兼容旧表结构，添加缺失列（生产环境升级）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS guiding_questions JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scope_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DECIMAL(10, 8);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DECIMAL(11, 8);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_radius_meters INTEGER CHECK (geo_radius_meters BETWEEN 50 AND 1000);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_address TEXT;
-- 收紧已存在库的 geo_radius_meters CHECK（旧值 5000），与前端/后端 schema 统一为 1000
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_geo_radius_meters_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_geo_radius_meters_check
  CHECK (geo_radius_meters IS NULL OR geo_radius_meters BETWEEN 50 AND 1000);
-- 旧数据可能没有外键约束，安全起见先删除再重建（幂等）
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_task_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_task_id_fkey
  FOREIGN KEY (source_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- 旧表的 scope_type CHECK 可能不包含 'pool'，需要更新约束
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_scope_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_scope_type_check
  CHECK (scope_type IN ('school', 'college', 'class', 'pool'));

-- 旧表的 valid_task_scope CHECK 可能不包含 pool 规则，需要更新约束
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS valid_task_scope;
ALTER TABLE tasks ADD CONSTRAINT valid_task_scope CHECK (
  (scope_type = 'school' AND target_college_id IS NULL AND target_class_id IS NULL) OR
  (scope_type = 'college' AND target_college_id IS NOT NULL AND target_class_id IS NULL) OR
  (scope_type = 'class' AND target_college_id IS NULL AND target_class_id IS NOT NULL) OR
  (scope_type = 'pool' AND target_college_id IS NULL AND target_class_id IS NULL)
);

-- AD-21: 防止重复派发（同一源任务对同一班级只能派发一次）
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_unique_dispatch ON tasks(source_task_id, target_class_id) 
  WHERE source_task_id IS NOT NULL AND target_class_id IS NOT NULL;

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

-- 辅导员一键提醒记录表（Epic 8.3）
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'wechat_subscribe',
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped_no_openid', 'already_reminded')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 存量表兼容：新增 task_id 列
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
-- 同一学生对同一任务仅允许一条成功提醒记录；失败/跳过允许重试
DROP INDEX IF EXISTS idx_reminders_unique_sent;
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_student_id_reminder_date_key;
CREATE UNIQUE INDEX idx_reminders_unique_sent ON reminders(student_id, task_id) WHERE status = 'sent' AND task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_task_class ON reminders(task_id, class_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_student ON reminders(task_id, student_id);
CREATE INDEX IF NOT EXISTS idx_reminders_class_date ON reminders(class_id, reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_student_date ON reminders(student_id, reminder_date);

-- 地理围栏表（Epic 4.5 / AD-20）
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL CHECK (radius_meters BETWEEN 50 AND 5000),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('school', 'college', 'class')),
  scope_id UUID,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_scope ON geofences(scope_type, scope_id, is_enabled);

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 人脸识别（Epic: 人脸打卡）
-- ─────────────────────────────────────────────────────────────────────────────

-- 任务级人脸开关：发任务时可选「需要人脸验证」，开启后学生打卡须拍照比对
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS require_face BOOLEAN NOT NULL DEFAULT false;

-- 用户注册照特征向量：管理员导入注册照后，提取 512 维向量存此表。
--   V1 每人一张（UNIQUE(user_id)），存向量而非原图做比对，比对即向量点积（毫秒级）。
CREATE TABLE IF NOT EXISTS user_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,         -- 注册照存储路径（本地文件系统）
  embedding FLOAT8[] NOT NULL,      -- 512 维归一化特征向量
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_faces_user_id ON user_faces(user_id);

-- 审计日志表（系统运维：登录、失败登录、管理员敏感操作）
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,                 -- login / login_failed / logout / create / update / delete / export / backup / cleanup 等
  category TEXT NOT NULL,               -- auth / user / task / organization / system
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_role TEXT,
  target_type TEXT,                     -- user / task / college / class / system
  target_id TEXT,
  target_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

-- 打卡记录扩展：关联现场照与人脸验证结果，供管理员抽查与审计
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS face_photo_path TEXT;       -- 现场照存储路径
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS face_verified BOOLEAN;      -- 是否通过人脸验证（null=未要求/降级）
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS face_similarity FLOAT8;     -- 比对相似度（未要求时为 null）

-- ─────────────────────────────────────────────────────────────────────────────
-- 学习资料库（Epic: 学习内容）
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('article', 'video', 'document', 'link')),
  content TEXT,                          -- 图文内容（article/document 类型使用）
  url TEXT,                              -- 外部链接或视频链接（article/video/link 类型使用）
  cover_url TEXT,                        -- 封面图本地相对路径
  category TEXT,                         -- 分类，如「党史」「理论」「时事」
  tags TEXT[],                           -- 标签数组
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_learning_resources_updated_at ON learning_resources;
CREATE TRIGGER update_learning_resources_updated_at
  BEFORE UPDATE ON learning_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_learning_resources_status ON learning_resources(status);
CREATE INDEX IF NOT EXISTS idx_learning_resources_type ON learning_resources(type);
CREATE INDEX IF NOT EXISTS idx_learning_resources_category ON learning_resources(category);
CREATE INDEX IF NOT EXISTS idx_learning_resources_created_by ON learning_resources(created_by);
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
