import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import { config } from '../src/config/index.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL;

function createToken(role: 'student' | 'counselor' | 'admin', userId: string): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '1h' });
}

async function seedUser(client: Client, id: string, schoolId: string, role: string, classId: string | null) {
  const hash = await bcrypt.hash('123456', 10);
  await client.query(
    `INSERT INTO users (id, school_id, password_hash, role, is_initial_password, class_id)
     VALUES ($1, $2, $3, $4, true, $5)
     ON CONFLICT (id) DO UPDATE SET school_id = EXCLUDED.school_id, role = EXCLUDED.role, class_id = EXCLUDED.class_id`,
    [id, schoolId, hash, role, classId]
  );
}

describe.skipIf(!DATABASE_URL)('CheckIns API', () => {
  let client: Client;
  const collegeId = '10000000-0000-0000-0000-000000000010';
  const classId = '10000000-0000-0000-0000-000000000011';
  const otherClassId = '10000000-0000-0000-0000-000000000012';
  const studentId = '20000000-0000-0000-0000-000000000010';
  const otherStudentId = '20000000-0000-0000-0000-000000000011';
  const counselorId = '20000000-0000-0000-0000-000000000012';

  const studentToken = createToken('student', studentId);
  const otherStudentToken = createToken('student', otherStudentId);
  const counselorToken = createToken('counselor', counselorId);

  beforeAll(async () => {
    if (!DATABASE_URL) return;
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // 清理历史测试数据
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST CHECKIN%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST CHECKIN%'");
    await client.query(`DELETE FROM users WHERE id IN ('${studentId}', '${otherStudentId}', '${counselorId}')`);
    await client.query(`DELETE FROM classes WHERE id IN ('${classId}', '${otherClassId}')`);
    await client.query(`DELETE FROM colleges WHERE id = '${collegeId}'`);

    // 创建学院、班级、用户
    await client.query('INSERT INTO colleges (id, name) VALUES ($1, $2)', [collegeId, 'TEST  checkin学院']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [classId, collegeId, 'TEST  checkin一班']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [otherClassId, collegeId, 'TEST  checkin二班']);

    await seedUser(client, studentId, 'CHECKIN_S001', 'student', classId);
    await seedUser(client, otherStudentId, 'CHECKIN_S002', 'student', otherClassId);
    await seedUser(client, counselorId, 'CHECKIN_T001', 'counselor', null);
  });

  afterEach(async () => {
    if (!client) return;
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST CHECKIN%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST CHECKIN%'");
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  async function createTask(overrides: Record<string, unknown> = {}) {
    const payload = {
      title: 'TEST CHECKIN 示例任务',
      content: '签到任务内容',
      scope_type: 'class',
      target_college_id: null,
      target_class_id: classId,
      created_by: counselorId,
      published_at: new Date(Date.now() - 1000).toISOString(),
      deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
    const res = await client.query(
      `INSERT INTO tasks
       (title, content, scope_type, target_college_id, target_class_id, created_by, published_at, deadline_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        payload.title,
        payload.content,
        payload.scope_type,
        payload.target_college_id,
        payload.target_class_id,
        payload.created_by,
        payload.published_at,
        payload.deadline_at,
      ]
    );
    return res.rows[0] as { id: string };
  }

  describe('POST /api/checkins', () => {
    it('creates a check-in for visible task', async () => {
      const task = await createTask();
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 31.2304, longitude: 121.4737 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.latitude).toBe(31.2304);
      expect(res.body.data.longitude).toBe(121.4737);
    });

    it('updates existing check-in on re-checkin', async () => {
      const task = await createTask();
      await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 31.0, longitude: 121.0 });

      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 31.9999, longitude: 121.9999 });

      expect(res.status).toBe(200);
      expect(res.body.data.latitude).toBe(31.9999);
    });

    it('rejects check-in for non-existent task', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: '30000000-0000-0000-0000-000000000000', latitude: 31.2304, longitude: 121.4737 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('rejects check-in for task not visible to student', async () => {
      const task = await createTask({ target_class_id: otherClassId });
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 31.2304, longitude: 121.4737 });

      expect(res.status).toBe(404);
    });

    it('rejects check-in after deadline', async () => {
      const task = await createTask({
        published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        deadline_at: new Date(Date.now() - 1000).toISOString(),
      });
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 31.2304, longitude: 121.4737 });

      expect(res.status).toBe(409);
    });

    it('rejects non-student roles', async () => {
      const task = await createTask();
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ task_id: task.id, latitude: 31.2304, longitude: 121.4737 });

      expect(res.status).toBe(403);
    });

    it('rejects invalid coordinates', async () => {
      const task = await createTask();
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 999, longitude: 121.4737 });

      expect(res.status).toBe(400);
    });

    it('accepts coordinates at zero (equator/prime meridian)', async () => {
      const task = await createTask();
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 0, longitude: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.latitude).toBe(0);
      expect(res.body.data.longitude).toBe(0);
    });

    it('rejects unauthenticated requests', async () => {
      const task = await createTask();
      const res = await request(app)
        .post('/api/checkins')
        .send({ task_id: task.id, latitude: 31.2304, longitude: 121.4737 });

      expect(res.status).toBe(401);
    });

    it('rejects address longer than 500 characters', async () => {
      const task = await createTask();
      const res = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ task_id: task.id, latitude: 31.2304, longitude: 121.4737, address: 'a'.repeat(501) });

      expect(res.status).toBe(400);
    });
  });
});
