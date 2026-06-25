import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

process.env.WECHAT_APP_ID = 'test-app-id';
process.env.WECHAT_APP_SECRET = 'test-app-secret';
process.env.WECHAT_REMINDER_TEMPLATE_ID = 'test-reminder-template-id';

import app from '../src/index.js';
import { config } from '../src/config/index.js';
import { sendSubscribeMessage } from '../src/lib/wechat.js';

vi.mock('../src/lib/wechat.js', () => ({
  sendSubscribeMessage: vi.fn().mockResolvedValue(undefined),
}));

const DATABASE_URL = process.env.TEST_DATABASE_URL;

function createToken(role: 'student' | 'counselor' | 'admin', userId: string): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '1h' });
}

async function seedUser(
  client: Client,
  id: string,
  schoolId: string,
  role: string,
  classId: string | null,
  name: string | null = null,
  wechatOpenid: string | null = null
) {
  const hash = await bcrypt.hash('123456', 10);
  await client.query(
    `INSERT INTO users (id, school_id, password_hash, role, is_initial_password, class_id, name, wechat_openid)
     VALUES ($1, $2, $3, $4, true, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       school_id = EXCLUDED.school_id,
       role = EXCLUDED.role,
       class_id = EXCLUDED.class_id,
       name = EXCLUDED.name,
       wechat_openid = EXCLUDED.wechat_openid`,
    [id, schoolId, hash, role, classId, name, wechatOpenid]
  );
}

describe.skipIf(!DATABASE_URL)('Counselor Dashboard API', () => {
  let client: Client;
  const collegeId = '10000000-0000-0000-0000-000000000100';
  const classIdA = '10000000-0000-0000-0000-000000000101';
  const classIdB = '10000000-0000-0000-0000-000000000102';
  const classIdOther = '10000000-0000-0000-0000-000000000103';
  const studentA1 = '20000000-0000-0000-0000-000000000101';
  const studentA2 = '20000000-0000-0000-0000-000000000102';
  const studentB1 = '20000000-0000-0000-0000-000000000103';
  const studentOther = '20000000-0000-0000-0000-000000000104';
  const counselorId = '20000000-0000-0000-0000-000000000105';
  const otherCounselorId = '20000000-0000-0000-0000-000000000106';

  const counselorToken = createToken('counselor', counselorId);
  const otherCounselorToken = createToken('counselor', otherCounselorId);
  const studentToken = createToken('student', studentA1);

  beforeAll(async () => {
    if (!DATABASE_URL) return;
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // 清理
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST COUNSELOR%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST COUNSELOR%'");
    await client.query(
      `DELETE FROM reminders WHERE student_id IN ('${studentA1}', '${studentA2}', '${studentB1}', '${studentOther}') OR counselor_id IN ('${counselorId}', '${otherCounselorId}')`
    );
    await client.query(
      `DELETE FROM users WHERE id IN ('${studentA1}', '${studentA2}', '${studentB1}', '${studentOther}', '${counselorId}', '${otherCounselorId}')`
    );
    await client.query(`DELETE FROM counselor_classes WHERE class_id IN ('${classIdA}', '${classIdB}', '${classIdOther}')`);
    await client.query(`DELETE FROM classes WHERE id IN ('${classIdA}', '${classIdB}', '${classIdOther}')`);
    await client.query(`DELETE FROM colleges WHERE id = '${collegeId}'`);

    // 学院 / 班级
    await client.query('INSERT INTO colleges (id, name) VALUES ($1, $2)', [collegeId, 'TEST COUNSELOR学院']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [classIdA, collegeId, 'TEST COUNSELOR一班']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [classIdB, collegeId, 'TEST COUNSELOR二班']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [classIdOther, collegeId, 'TEST COUNSELOR三班']);

    // 用户
    await seedUser(client, studentA1, 'COUNSELOR_S001', 'student', classIdA);
    await seedUser(client, studentA2, 'COUNSELOR_S002', 'student', classIdA);
    await seedUser(client, studentB1, 'COUNSELOR_S003', 'student', classIdB);
    await seedUser(client, studentOther, 'COUNSELOR_S004', 'student', classIdOther);
    await seedUser(client, counselorId, 'COUNSELOR_T001', 'counselor', null);
    await seedUser(client, otherCounselorId, 'COUNSELOR_T002', 'counselor', null);

    // 辅导员班级关联
    await client.query('INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)', [counselorId, classIdA]);
    await client.query('INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)', [counselorId, classIdB]);
    await client.query('INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)', [otherCounselorId, classIdOther]);
  });

  beforeEach(() => {
    // 一键提醒时间窗口测试需要落在 08:00-22:00 之间
    const now = new Date();
    const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const y = beijing.getUTCFullYear();
    const m = String(beijing.getUTCMonth() + 1).padStart(2, '0');
    const d = String(beijing.getUTCDate()).padStart(2, '0');
    process.env.REMINDER_TIME_OVERRIDE = `${y}-${m}-${d}T12:00:00+08:00`;
    vi.mocked(sendSubscribeMessage).mockClear();
  });

  afterEach(async () => {
    if (!client) return;
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST COUNSELOR%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST COUNSELOR%'");
    await client.query(
      `DELETE FROM reminders WHERE student_id IN ('${studentA1}', '${studentA2}', '${studentB1}', '${studentOther}') OR counselor_id IN ('${counselorId}', '${otherCounselorId}')`
    );
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  async function createTask(targetClassId: string, deadlineAt?: Date) {
    const res = await client.query(
      `INSERT INTO tasks
       (title, content, scope_type, target_college_id, target_class_id, created_by, published_at, deadline_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        'TEST COUNSELOR 任务',
        '任务内容',
        'class',
        null,
        targetClassId,
        counselorId,
        new Date(Date.now() - 1000).toISOString(),
        (deadlineAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString(),
      ]
    );
    return res.rows[0].id as string;
  }

  async function createApprovedCheckIn(taskId: string, userId: string, date = new Date()) {
    await client.query(
      `INSERT INTO check_ins (task_id, user_id, status, checked_in_at)
       VALUES ($1, $2, 'approved', $3)
       ON CONFLICT (task_id, user_id) DO UPDATE SET status = EXCLUDED.status, checked_in_at = EXCLUDED.checked_in_at`,
      [taskId, userId, date.toISOString()]
    );
  }

  describe('GET /api/counselor/dashboard', () => {
    it('returns tasks visible to the counselor with per-class stats', async () => {
      const taskA = await createTask(classIdA);
      await createApprovedCheckIn(taskA, studentA1);

      const res = await request(app)
        .get('/api/counselor/dashboard')
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { tasks } = res.body.data;
      expect(tasks).toHaveLength(1);

      const task = tasks[0];
      expect(task.task_id).toBe(taskA);
      expect(task.title).toBe('TEST COUNSELOR 任务');
      // class-scope 任务只对目标班级可见
      expect(task.classes).toHaveLength(1);

      const classA = task.classes.find((c: { class_id: string }) => c.class_id === classIdA);
      expect(classA.total_students).toBe(2);
      expect(classA.checked_in_count).toBe(1);
      expect(classA.check_in_rate).toBe(50);
      expect(classA.absent_count).toBe(1);
      expect(classA.reminded_count).toBe(0);
    });

    it('excludes classes of other counselors', async () => {
      const res = await request(app)
        .get('/api/counselor/dashboard')
        .set('Authorization', `Bearer ${counselorToken}`);

      const allClassIds = res.body.data.tasks.flatMap((t: { classes: { class_id: string }[] }) =>
        t.classes.map((c) => c.class_id)
      );
      expect(allClassIds).not.toContain(classIdOther);
    });

    it('rejects non-counselor roles', async () => {
      const res = await request(app)
        .get('/api/counselor/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/counselor/tasks/:id/classes', () => {
    it('returns class stats for a single task', async () => {
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .get(`/api/counselor/tasks/${taskA}/classes`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.task_id).toBe(taskA);
      // class-scope 任务只对目标班级可见
      expect(res.body.data.classes).toHaveLength(1);
      expect(res.body.data.classes[0].class_id).toBe(classIdA);
    });

    it('returns 404 for task not visible to counselor', async () => {
      const otherTask = await createTask(classIdOther);

      const res = await request(app)
        .get(`/api/counselor/tasks/${otherTask}/classes`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/counselor/classes/:id/students', () => {
    it('returns student list for a task and class', async () => {
      const taskA = await createTask(classIdA);
      await createApprovedCheckIn(taskA, studentA1);

      const res = await request(app)
        .get(`/api/counselor/classes/${classIdA}/students?task_id=${taskA}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(2);
      expect(res.body.data.task_id).toBe(taskA);

      const student = res.body.data.students.find((s: { student_id: string }) => s.student_id === studentA1);
      expect(student.checked_in).toBe(true);

      const absentStudent = res.body.data.students.find((s: { student_id: string }) => s.student_id === studentA2);
      expect(absentStudent.checked_in).toBe(false);
    });

    it('supports status filter', async () => {
      const taskA = await createTask(classIdA);
      await createApprovedCheckIn(taskA, studentA1);

      const checkedInRes = await request(app)
        .get(`/api/counselor/classes/${classIdA}/students?task_id=${taskA}&status=checked_in`)
        .set('Authorization', `Bearer ${counselorToken}`);
      expect(checkedInRes.body.data.students).toHaveLength(1);

      const absentRes = await request(app)
        .get(`/api/counselor/classes/${classIdA}/students?task_id=${taskA}&status=absent`)
        .set('Authorization', `Bearer ${counselorToken}`);
      expect(absentRes.body.data.students).toHaveLength(1);
    });

    it('returns 404 for unmanaged class', async () => {
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .get(`/api/counselor/classes/${classIdOther}/students?task_id=${taskA}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(404);
    });

    it('allows counselor to view their own class', async () => {
      const taskOther = await createTask(classIdOther);

      const res = await request(app)
        .get(`/api/counselor/classes/${classIdOther}/students?task_id=${taskOther}`)
        .set('Authorization', `Bearer ${otherCounselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.class_id).toBe(classIdOther);
    });

    it('calculates consecutive_absent_days and name fallback', async () => {
      const deadline = new Date('2026-06-20T12:00:00.000Z');
      const taskA = await createTask(classIdA, deadline);
      const baseDate = new Date('2026-06-20T12:00:00.000Z');
      const fourDaysAgo = new Date(baseDate.getTime() - 4 * 24 * 60 * 60 * 1000);

      await createApprovedCheckIn(taskA, studentA1, baseDate);
      await createApprovedCheckIn(taskA, studentA2, fourDaysAgo);

      const res = await request(app)
        .get(`/api/counselor/classes/${classIdA}/students?task_id=${taskA}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkedInStudent = res.body.data.students.find(
        (s: { student_id: string }) => s.student_id === studentA1
      );
      expect(checkedInStudent.checked_in).toBe(true);
      expect(checkedInStudent.consecutive_absent_days).toBe(0);
      expect(checkedInStudent.student_name).toBe(checkedInStudent.student_school_id);

      const pastCheckInStudent = res.body.data.students.find(
        (s: { student_id: string }) => s.student_id === studentA2
      );
      // 任务维度：只要在该任务下有 approved 打卡即视为已完成
      expect(pastCheckInStudent.checked_in).toBe(true);
      // 最近一次打卡距截止日相差 4 天
      expect(pastCheckInStudent.consecutive_absent_days).toBe(4);
    });

    it('returns 400 when task_id is missing', async () => {
      const res = await request(app)
        .get(`/api/counselor/classes/${classIdA}/students`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/counselor/classes/:id/reminders', () => {
    it('sends reminders to absent students with openid', async () => {
      await seedUser(client, studentA2, 'COUNSELOR_S002', 'student', classIdA, '学生A2', 'openid-a2');
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        total: 1,
        sent: 1,
        skipped_no_openid: 0,
        already_reminded: 0,
        failed: 0,
      });
      expect(sendSubscribeMessage).toHaveBeenCalledTimes(1);

      const listRes = await request(app)
        .get(`/api/counselor/classes/${classIdA}/students?task_id=${taskA}&status=absent`)
        .set('Authorization', `Bearer ${counselorToken}`);
      const student = listRes.body.data.students.find(
        (s: { student_id: string }) => s.student_id === studentA2
      );
      expect(student.reminded).toBe(true);
    });

    it('skips students without wechat_openid', async () => {
      await seedUser(client, studentA2, 'COUNSELOR_S002', 'student', classIdA, '学生A2', null);
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        total: 1,
        sent: 0,
        skipped_no_openid: 1,
        already_reminded: 0,
        failed: 0,
      });
      expect(sendSubscribeMessage).not.toHaveBeenCalled();
    });

    it('rejects checked-in students', async () => {
      const taskA = await createTask(classIdA);
      await createApprovedCheckIn(taskA, studentA1);

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA1], task_id: taskA });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects students outside the class', async () => {
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentOther], task_id: taskA });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('enforces one reminder per student per task', async () => {
      await seedUser(client, studentA2, 'COUNSELOR_S002', 'student', classIdA, '学生A2', 'openid-a2');
      const taskA = await createTask(classIdA);

      const first = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });
      expect(first.body.data.sent).toBe(1);

      vi.mocked(sendSubscribeMessage).mockClear();

      const second = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });

      expect(second.status).toBe(200);
      expect(second.body.data).toEqual({
        total: 1,
        sent: 0,
        skipped_no_openid: 0,
        already_reminded: 1,
        failed: 0,
      });
      expect(sendSubscribeMessage).not.toHaveBeenCalled();
    });

    it('rejects requests outside 08:00-22:00 Beijing time', async () => {
      process.env.REMINDER_TIME_OVERRIDE = '2026-06-24T23:00:00+08:00';
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('REMINDER_TIME_WINDOW');
    });

    it('returns 404 for unmanaged class', async () => {
      const taskA = await createTask(classIdA);

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdOther}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentOther], task_id: taskA });

      expect(res.status).toBe(404);
    });

    it('fails gracefully when WeChat send fails', async () => {
      await seedUser(client, studentA2, 'COUNSELOR_S002', 'student', classIdA, '学生A2', 'openid-a2');
      const taskA = await createTask(classIdA);
      vi.mocked(sendSubscribeMessage).mockRejectedValueOnce(new Error('subscribe denied'));

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        total: 1,
        sent: 0,
        skipped_no_openid: 0,
        already_reminded: 0,
        failed: 1,
      });

      const listRes = await request(app)
        .get(`/api/counselor/classes/${classIdA}/reminders?task_id=${taskA}`)
        .set('Authorization', `Bearer ${counselorToken}`);
      expect(listRes.body.data.reminders).toHaveLength(1);
      expect(listRes.body.data.reminders[0].status).toBe('failed');
      expect(listRes.body.data.reminders[0].error_message).toBe('微信订阅消息发送失败');
    });

    it('rejects reminders after task deadline', async () => {
      const pastTask = await createTask(classIdA, new Date(Date.now() - 24 * 60 * 60 * 1000));

      const res = await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: pastTask });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('TASK_DEADLINE_PASSED');
    });

    it('rejects invalid class ID format', async () => {
      const res = await request(app)
        .post('/api/counselor/classes/not-a-uuid/reminders')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/counselor/classes/:id/reminders', () => {
    it('returns reminder records for the class and task', async () => {
      await seedUser(client, studentA2, 'COUNSELOR_S002', 'student', classIdA, '学生A2', 'openid-a2');
      const taskA = await createTask(classIdA);
      await request(app)
        .post(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ student_ids: [studentA2], task_id: taskA });

      const res = await request(app)
        .get(`/api/counselor/classes/${classIdA}/reminders?task_id=${taskA}`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reminders).toHaveLength(1);
      expect(res.body.data.reminders[0].student_id).toBe(studentA2);
      expect(res.body.data.reminders[0].status).toBe('sent');
    });

    it('returns 400 when task_id is missing', async () => {
      const res = await request(app)
        .get(`/api/counselor/classes/${classIdA}/reminders`)
        .set('Authorization', `Bearer ${counselorToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─── Epic 8.4: 辅导员数据导出 ───────────────────────────────────────────

  describe('POST /api/counselor/exports', () => {
    it('returns 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 for student role', async () => {
      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ class_ids: [classIdA], start_date: '2026-06-01', end_date: '2026-06-24' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for unmanaged class', async () => {
      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ class_ids: [classIdOther], start_date: '2026-06-01', end_date: '2026-06-24' });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
    });

    it('returns EXPORT_NO_DATA when no records exist', async () => {
      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ class_ids: [classIdA], start_date: '2026-06-01', end_date: '2026-06-24' });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('EXPORT_NO_DATA');
    });

    it('returns download_url on success', async () => {
      const taskId = await createTask(classIdA);
      await createApprovedCheckIn(taskId, studentA1, new Date('2026-06-20T10:00:00+08:00'));

      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ class_ids: [classIdA], start_date: '2026-06-19', end_date: '2026-06-21' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.download_url).toMatch(/^\/api\/exports\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      expect(typeof res.body.data.expires_at).toBe('string');
    });

    it('rejects start_date > end_date', async () => {
      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ class_ids: [classIdA], start_date: '2026-06-25', end_date: '2026-06-01' });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('EXPORT_RANGE_INVALID');
    });

    it('rejects range > 90 days', async () => {
      const res = await request(app)
        .post('/api/counselor/exports')
        .set('Authorization', `Bearer ${counselorToken}`)
        .send({ class_ids: [classIdA], start_date: '2026-06-01', end_date: '2026-10-01' });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('EXPORT_RANGE_TOO_WIDE');
    });
  });
});
