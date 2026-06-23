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
import * as reviewsService from '../src/domains/reviews/reviews.service.js';

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

  async function createCheckIn(taskId: string, userId = studentId) {
    const res = await client.query(
      `INSERT INTO check_ins (task_id, user_id, status, latitude, longitude, checked_in_at)
       VALUES ($1, $2, 'submitted', 31.2304, 121.4737, NOW())
       RETURNING id`,
      [taskId, userId]
    );
    return res.rows[0] as { id: string };
  }

  async function createCheckInWithReflection(
    taskId: string,
    content: string,
    status: string,
    userId = studentId,
    reflectionModified = false
  ) {
    const res = await client.query(
      `INSERT INTO check_ins (
         task_id, user_id, status, latitude, longitude, checked_in_at,
         reflection_content, reflection_modified
       )
       VALUES ($1, $2, $3, 31.2304, 121.4737, NOW(), $4, $5)
       RETURNING id`,
      [taskId, userId, status, content, reflectionModified]
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

  describe('POST /api/checkins/:id/reflection', () => {
    it('submits reflection and gets ai_approved', async () => {
      const task = await createTask({ content: '本次思政课主题为新时代青年的责任担当。' });
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '参观完展览后，我对革命先辈的牺牲精神有了更具体的理解。' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ai_approved');
      expect(res.body.data.reflection_content).toBe('参观完展览后，我对革命先辈的牺牲精神有了更具体的理解。');
      expect(res.body.data.reflection_modified).toBe(false);
      expect(res.body.data.ai_review_reason).toBe('AI 初审通过');

      const reviewRows = await client.query(
        'SELECT * FROM ai_reviews WHERE check_in_id = $1 ORDER BY created_at DESC',
        [checkIn.id]
      );
      expect(reviewRows.rows.length).toBe(1);
      expect(reviewRows.rows[0].status).toBe('ai_approved');
      expect(reviewRows.rows[0].reason).toBe('AI 初审通过');
      expect(reviewRows.rows[0].reason_code).toBe('ai_approved');
      expect(reviewRows.rows[0].reflection_content).toBe('参观完展览后，我对革命先辈的牺牲精神有了更具体的理解。');
    });

    it('submits reflection and gets pending_manual_review for sensitive word', async () => {
      const task = await createTask();
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '这次学习让我认识到赌博的危害，感想很深。' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending_manual_review');
      expect(res.body.data.ai_review_reason).toBe('包含敏感内容');

      const reviewRows = await client.query(
        'SELECT * FROM ai_reviews WHERE check_in_id = $1 ORDER BY created_at DESC',
        [checkIn.id]
      );
      expect(reviewRows.rows.length).toBe(1);
      expect(reviewRows.rows[0].status).toBe('pending_manual_review');
      expect(reviewRows.rows[0].reason).toBe('包含敏感内容');
      expect(reviewRows.rows[0].reason_code).toBe('sensitive_content');
    });

    it('allows modifying reflection once before review', async () => {
      const task = await createTask({ content: '本次思政课主题为新时代青年的责任担当。' });
      // 构造已提交但尚未进入最终审核状态的场景
      const checkIn = await createCheckInWithReflection(
        task.id,
        '第一次提交的心得内容。',
        'ai_reviewing'
      );

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '修改后的心得内容，结合个人实际谈谈对责任担当的理解。' });

      expect(res.status).toBe(200);
      expect(res.body.data.reflection_modified).toBe(true);
    });

    it('rejects modifying reflection more than once', async () => {
      const task = await createTask({ content: '本次思政课主题为新时代青年的责任担当。' });
      const checkIn = await createCheckInWithReflection(
        task.id,
        '第一次提交的心得内容。',
        'ai_reviewing',
        studentId,
        true
      );

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '第二次修改后的心得内容。' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CHECKIN_REFLECTION_ALREADY_MODIFIED');
    });

    it('allows modifying reflection once from pending_manual_review', async () => {
      const task = await createTask({ content: '本次思政课主题为新时代青年的责任担当。' });
      const checkIn = await createCheckInWithReflection(
        task.id,
        '第一次提交的心得内容。',
        'pending_manual_review',
        studentId,
        false
      );

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '修改后的心得内容，结合个人实际谈谈对责任担当的理解。' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reflection_content).toBe('修改后的心得内容，结合个人实际谈谈对责任担当的理解。');
      expect(res.body.data.reflection_modified).toBe(true);
      expect(res.body.data.status).toBe('ai_approved');

      const reviewRows = await client.query(
        'SELECT * FROM ai_reviews WHERE check_in_id = $1 ORDER BY created_at DESC',
        [checkIn.id]
      );
      expect(reviewRows.rows.length).toBe(1);
      expect(reviewRows.rows[0].status).toBe('ai_approved');
      expect(reviewRows.rows[0].reflection_content).toBe(
        '修改后的心得内容，结合个人实际谈谈对责任担当的理解。'
      );
    });

    it('rejects modifying reflection more than once from pending_manual_review', async () => {
      const task = await createTask();
      const checkIn = await createCheckInWithReflection(
        task.id,
        '第一次提交的心得内容。',
        'pending_manual_review',
        studentId,
        true
      );

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '第二次修改后的心得内容。' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CHECKIN_REFLECTION_ALREADY_MODIFIED');
    });

    it('rejects reflection for non-existent check-in', async () => {
      const res = await request(app)
        .post('/api/checkins/30000000-0000-0000-0000-000000000000/reflection')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '这是一条不存在打卡记录的心得。' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CHECKIN_NOT_FOUND');
    });

    it('rejects reflection for check-in owned by another student', async () => {
      const task = await createTask();
      const otherStudentCheckIn = await createCheckIn(task.id, otherStudentId);

      const res = await request(app)
        .post(`/api/checkins/${otherStudentCheckIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '我尝试提交别人的打卡心得。' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CHECKIN_NOT_FOUND');
    });

    it('rejects non-student roles', async () => {
      const task = await createTask();
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ content: '辅导员尝试提交心得。' });

      expect(res.status).toBe(403);
    });

    it('rejects reflection after deadline', async () => {
      const task = await createTask({
        published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        deadline_at: new Date(Date.now() - 1000).toISOString(),
      });
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '任务已截止，但我还想提交心得。' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CHECKIN_DEADLINE_PASSED');
    });

    it('rejects reflection shorter than 10 characters', async () => {
      const task = await createTask();
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '太短' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects reflection longer than 500 characters', async () => {
      const task = await createTask();
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'a'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unauthenticated requests', async () => {
      const task = await createTask();
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .send({ content: '未认证用户提交心得。' });

      expect(res.status).toBe(401);
    });

    it('allows resubmitting reflection when status is requires_modification', async () => {
      const task = await createTask({ content: '本次思政课主题为新时代青年的责任担当。' });
      const checkIn = await createCheckInWithReflection(
        task.id,
        '第一次提交的心得内容。',
        'requires_modification',
        studentId,
        true
      );

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '辅导员要求修改后重新提交的心得内容。' });

      expect(res.status).toBe(200);
      expect(res.body.data.reflection_content).toBe('辅导员要求修改后重新提交的心得内容。');
      expect(res.body.data.status).toBe('ai_approved');
    });

    it('degrades to pending_manual_review when AI review throws', async () => {
      const spy = vi
        .spyOn(reviewsService, 'aiReviewReflection')
        .mockRejectedValueOnce(new Error('AI review service failure'));

      const task = await createTask();
      const checkIn = await createCheckIn(task.id);

      const res = await request(app)
        .post(`/api/checkins/${checkIn.id}/reflection`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '正常的心得内容，但 AI 服务异常。' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending_manual_review');
      expect(res.body.data.ai_review_reason).toBe('AI 审核异常，转人工复核');

      const reviewRows = await client.query(
        'SELECT * FROM ai_reviews WHERE check_in_id = $1 ORDER BY created_at DESC',
        [checkIn.id]
      );
      expect(reviewRows.rows.length).toBe(1);
      expect(reviewRows.rows[0].status).toBe('pending_manual_review');
      expect(reviewRows.rows[0].reason).toBe('AI 审核异常，转人工复核');
      expect(reviewRows.rows[0].reason_code).toBe('ai_review_error');

      spy.mockRestore();
    });
  });

  describe('GET /api/checkins/:id/result', () => {
    it('returns result summary for ai_approved check-in', async () => {
      const task = await createTask({ title: 'TEST CHECKIN 结果反馈任务' });
      const checkIn = await createCheckInWithReflection(
        task.id,
        '今天学习很有收获，对思政内容有了更深的理解。',
        'ai_approved'
      );

      const res = await request(app)
        .get(`/api/checkins/${checkIn.id}/result`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.check_in_id).toBe(checkIn.id);
      expect(res.body.data.task_title).toBe('TEST CHECKIN 结果反馈任务');
      expect(res.body.data.status).toBe('ai_approved');
      expect(res.body.data.base_points).toBe(10);
      expect(res.body.data.streak_days).toBeGreaterThanOrEqual(1);
      expect(res.body.data.next_level_progress).toBeGreaterThanOrEqual(0);
      expect(res.body.data.next_level_progress).toBeLessThanOrEqual(100);
    });

    it('computes streak days from distinct dates', async () => {
      const today = new Date();
      const dayMs = 24 * 60 * 60 * 1000;
      let latestId = '';

      // 创建今天、昨天、前天三个不同任务的 ai_approved 打卡（同一任务只能有一条打卡记录）
      for (let i = 0; i < 3; i++) {
        const task = await createTask({ title: `TEST CHECKIN 连续打卡任务 ${i}` });
        const checkedInAt = new Date(today.getTime() - i * dayMs).toISOString();
        const result = await client.query<{ id: string }>(
          `INSERT INTO check_ins (
             task_id, user_id, status, latitude, longitude, checked_in_at,
             reflection_content, reflection_modified
           )
           VALUES ($1, $2, 'ai_approved', 31.2304, 121.4737, $3, $4, false)
           RETURNING id`,
          [task.id, studentId, checkedInAt, `第 ${i + 1} 天心得`]
        );
        if (i === 0) latestId = result.rows[0].id;
      }

      const res = await request(app)
        .get(`/api/checkins/${latestId}/result`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.streak_days).toBe(3);
      expect(res.body.data.earned_badge).toBeNull();
    });

    it('awards badge when streak reaches 7 days', async () => {
      const today = new Date();
      const dayMs = 24 * 60 * 60 * 1000;
      let latestId = '';

      for (let i = 0; i < 7; i++) {
        const task = await createTask({ title: `TEST CHECKIN 7天勋章任务 ${i}` });
        const checkedInAt = new Date(today.getTime() - i * dayMs).toISOString();
        const result = await client.query<{ id: string }>(
          `INSERT INTO check_ins (
             task_id, user_id, status, latitude, longitude, checked_in_at,
             reflection_content, reflection_modified
           )
           VALUES ($1, $2, 'ai_approved', 31.2304, 121.4737, $3, $4, false)
           RETURNING id`,
          [task.id, studentId, checkedInAt, `第 ${i + 1} 天心得`]
        );
        if (i === 0) latestId = result.rows[0].id;
      }

      const res = await request(app)
        .get(`/api/checkins/${latestId}/result`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.streak_days).toBe(7);
      expect(res.body.data.earned_badge).toBe('坚持一周');
      expect(res.body.data.next_level_progress).toBe(Math.round((7 / 30) * 100));
    });

    it('rejects result query for non-existent check-in', async () => {
      const res = await request(app)
        .get('/api/checkins/30000000-0000-0000-0000-000000000000/result')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CHECKIN_NOT_FOUND');
    });

    it('rejects result query for check-in owned by another student', async () => {
      const task = await createTask({ title: 'TEST CHECKIN 他人打卡任务' });
      const otherStudentCheckIn = await createCheckInWithReflection(
        task.id,
        '其他学生的心得。',
        'ai_approved',
        otherStudentId
      );

      const res = await request(app)
        .get(`/api/checkins/${otherStudentCheckIn.id}/result`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CHECKIN_NOT_FOUND');
    });

    it('rejects non-student roles', async () => {
      const task = await createTask();
      const checkIn = await createCheckInWithReflection(task.id, '心得内容', 'ai_approved');

      const res = await request(app)
        .get(`/api/checkins/${checkIn.id}/result`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects invalid uuid', async () => {
      const res = await request(app)
        .get('/api/checkins/not-a-uuid/result')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
