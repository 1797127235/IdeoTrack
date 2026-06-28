import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query('BEGIN');

    // 1. 确保 task_templates 表已存在（由 migrate.ts 创建）
    const tableExists = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'task_templates'"
    );
    if (tableExists.rows.length === 0) {
      throw new Error('task_templates 表不存在，请先运行 npm run db:migrate');
    }

    // 2. 确保 tasks 表已有 template_id 列
    const columnExists = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'template_id'"
    );
    if (columnExists.rows.length === 0) {
      throw new Error('tasks.template_id 列不存在，请先运行 npm run db:migrate');
    }

    // 3. 迁移 pool 任务到 task_templates，复用原 UUID
    const migrated = await client.query(
      `INSERT INTO task_templates (
        id, title, content, guiding_questions, source_url, video_url,
        geo_lat, geo_lng, geo_radius_meters, geo_address, require_face,
        created_by, status, created_at, updated_at
      )
      SELECT
        id, title, content, guiding_questions, source_url, video_url,
        geo_lat, geo_lng, geo_radius_meters, geo_address, require_face,
        created_by, status, created_at, updated_at
      FROM tasks
      WHERE scope_type = 'pool'
      ON CONFLICT (id) DO NOTHING
      RETURNING id`
    );
    console.log(`Migrated ${migrated.rows.length} pool tasks to task_templates`);

    // 4. 对派发实例设置 template_id
    const updated = await client.query(
      `UPDATE tasks t_instance
       SET template_id = t_instance.source_task_id
       WHERE t_instance.source_task_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM task_templates tt WHERE tt.id = t_instance.source_task_id)`
    );
    console.log(`Updated ${updated.rowCount ?? 0} dispatched tasks with template_id`);

    // 5. 删除 tasks 表中的 pool 记录
    const deleted = await client.query("DELETE FROM tasks WHERE scope_type = 'pool'");
    console.log(`Deleted ${deleted.rowCount ?? 0} pool records from tasks`);

    // 6. 删除 source_task_id 列（可选，确认所有代码已改造完成后再执行）
    // await client.query('ALTER TABLE tasks DROP COLUMN IF EXISTS source_task_id');
    // console.log('Dropped source_task_id column');

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
