import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../src/adapters/llm/index.js', () => ({
  createLLMProvider: vi.fn(() => null),
}));

import app from '../src/index.js';
import { config } from '../src/config/index.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL;

function createToken(role: 'student' | 'counselor' | 'admin', userId: string): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '1h' });
}

async function seedUser(
  client: Client,
  id: string,
  schoolId: string,
  role: string,
  classId: string | null
) {
  const hash = await bcrypt.hash('123456', 10);
  await client.query(
    `INSERT INTO users (id, school_id, password_hash, role, is_initial_password, class_id)
     VALUES ($1, $2, $3, $4, true, $5)
     ON CONFLICT (id) DO UPDATE SET school_id = EXCLUDED.school_id, role = EXCLUDED.role, class_id = EXCLUDED.class_id`,
    [id, schoolId, hash, role, classId]
  );
}

describe.skipIf(!DATABASE_URL)('Reviews API (counselor manual review)', () => {
  let client: Client;
  const collegeId = '10000000-0000-0000-0000-000000000020';
  const classId = '10000000-0000-0000-0000-000000000021';
  const otherClassId = '10000000-0000-0000-0000-000000000022';
  const studentId = '20000000-0000-0000-0000-000000000020';
  const otherStudentId = '20000000-0000-0000-0000-000000000021';
  const counselorId = '20000000-0000-0000-0000-000000000022';
  const otherCounselorId = '20000000-0000-0000-0000-000000000023';

  const counselorToken = createToken('counselor', counselorId);
  const otherCounselorToken = createToken('counselor', otherCounselorId);
  const studentToken = createToken('student', studentId);

  beforeAll(async () => {
    if (!DATABASE_URL) return;
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // 清理历史测试数据
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST REVIEW%')");
    await client.query("DELETE FROM point_records WHERE check_in_id IN (SELECT id FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST REVIEW%'))");
    await client.query("DELETE FROM ai_reviews WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST REVIEW%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST REVIEW%'");
    await client.query(
      `DELETE FROM counselor_classes WHERE counselor_id IN ('${counselorId}', '${otherCounselorId}')`
    );
    await client.query(
      `DELETE FROM users WHERE id IN ('${studentId}', '${otherStudentId}', '${counselorId}', '${otherCounselorId}')`
    );
    await client.query(`DELETE FROM classes WHERE id IN ('${classId}', '${otherClassId}')`);
    await client.query(`DELETE FROM colleges WHERE id = '${collegeId}'`);

    // 创建学院、班级、用户
    await client.query('INSERT INTO colleges (id, name) VALUES ($1, $2)', [collegeId, 'TEST REVIEW 学院']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [classId, collegeId, 'TEST REVIEW 一班']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [otherClassId, collegeId, 'TEST REVIEW 二班']);

    await seedUser(client, studentId, 'REVIEW_S001', 'student', classId);
    await seedUser(client, otherStudentId, 'REVIEW_S002', 'student', otherClassId);
    await seedUser(client, counselorId, 'REVIEW_T001', 'counselor', null);
    await seedUser(client, otherCounselorId, 'REVIEW_T002', 'counselor', null);

    // 辅导员-班级关联
    await client.query(
      'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)',
      [counselorId, classId]
    );
    await client.query(
      'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)',
      [otherCounselorId, otherClassId]
    );
  });

  afterEach(async () => {
    if (!client) return;
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST REVIEW%')");
    await client.query("DELETE FROM point_records WHERE check_in_id IN (SELECT id FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST REVIEW%'))");
    await client.query("DELETE FROM ai_reviews WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST REVIEW%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST REVIEW%'");
  });

  afterAll(async () => {
    if (!client) return;
    await client.end();
  });

  async function createPendingCheckIn(title: string, targetClassId: string, student: string) {
    const taskResult = await client.query<{ id: string }>(
      `INSERT INTO tasks (title, content, scope_type, target_class_id, created_by, published_at, deadline_at, status)
       VALUES ($1, $2, 'class', $3, $4, NOW(), NOW() + INTERVAL '7 days', 'published')
       RETURNING id`,
      [title, '任务内容示例', targetClassId, counselorId]
    );
    const taskId = taskResult.rows[0].id;

    const checkInResult = await client.query<{ id: string }>(
      `INSERT INTO check_ins (task_id, user_id, status, checked_in_at, reflection_content, ai_review_reason)
       VALUES ($1, $2, 'pending_manual_review', NOW(), $3, '字数不足')
       RETURNING id`,
      [taskId, student, '这是一条待复核心得。']
    );
    return { taskId, checkInId: checkInResult.rows[0].id };
  }

  describe('GET /api/reviews/pending', () => {
    it('returns pending reviews only for classes managed by the counselor', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 本班任务', classId, studentId);
      await createPendingCheckIn('TEST REVIEW 其他班任务', otherClassId, otherStudentId);

      const res = await request(app)
        .get('/api/reviews/pending')
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].check_in_id).toBe(checkInId);
      expect(res.body.data.total).toBe(1);
    });

    it('supports pagination', async () => {
      await createPendingCheckIn('TEST REVIEW 任务 A', classId, studentId);
      await createPendingCheckIn('TEST REVIEW 任务 B', classId, studentId);

      const res = await request(app)
        .get('/api/reviews/pending?page=1&limit=1')
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.limit).toBe(1);
    });

    it('filters by classId', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 本班任务', classId, studentId);

      const res = await request(app)
        .get(`/api/reviews/pending?classId=${classId}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].check_in_id).toBe(checkInId);
    });

    it('rejects non-counselor access', async () => {
      const res = await request(app)
        .get('/api/reviews/pending')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/reviews/pending/:id', () => {
    it('returns detail for a managed pending review', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 详情任务', classId, studentId);

      const res = await request(app)
        .get(`/api/reviews/pending/${checkInId}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.check_in_id).toBe(checkInId);
      expect(res.body.data.reflection_content).toBe('这是一条待复核心得。');
    });

    it('returns 404 for pending review from other counselor class', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 其他班详情', otherClassId, otherStudentId);

      const res = await request(app)
        .get(`/api/reviews/pending/${checkInId}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects invalid id', async () => {
      const res = await request(app)
        .get('/api/reviews/pending/not-a-uuid')
        .set('Authorization', `Bearer ${counselorToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/reviews/:id/decision', () => {
    it('approves and awards points', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 通过任务', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ decision: 'approve' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');

      const pointResult = await client.query(
        'SELECT points FROM point_records WHERE check_in_id = $1',
        [checkInId]
      );
      expect(pointResult.rows[0].points).toBe(10);
    });

    it('rejects a pending review', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 不通过任务', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ decision: 'reject', feedback: '内容不符合要求' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.review_feedback).toBe('内容不符合要求');
    });

    it('requires feedback for require_modification', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 修改任务', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ decision: 'require_modification' });

      expect(res.status).toBe(400);
    });

    it('sets requires_modification with feedback', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 修改任务2', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ decision: 'require_modification', feedback: '请补充个人体会' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('requires_modification');
      expect(res.body.data.review_feedback).toBe('请补充个人体会');
    });

    it('prevents cross-class review', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 越权任务', otherClassId, otherStudentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ decision: 'approve' });

      expect(res.status).toBe(404);
    });

    it('prevents other counselor from reviewing', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 其他辅导员任务', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${otherCounselorToken}`)
        .send({ decision: 'approve' });

      expect(res.status).toBe(404);
    });

    it('rejects invalid decision', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 无效决策', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ decision: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('rejects non-counselor access', async () => {
      const { checkInId } = await createPendingCheckIn('TEST REVIEW 学生越权', classId, studentId);

      const res = await request(app)
        .post(`/api/reviews/${checkInId}/decision`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ decision: 'approve' });

      expect(res.status).toBe(403);
    });
  });
});
