import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import { config } from '../src/config/index.js';

vi.setConfig({ testTimeout: 10000 });

const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

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

describe.skipIf(!DATABASE_URL)('Tasks API', () => {
  let client: Client;
  const collegeId = '10000000-0000-0000-0000-000000000001';
  const classId = '10000000-0000-0000-0000-000000000002';
  const otherClassId = '10000000-0000-0000-0000-000000000003';
  const studentId = '20000000-0000-0000-0000-000000000001';
  const counselorId = '20000000-0000-0000-0000-000000000002';
  const otherCounselorId = '20000000-0000-0000-0000-000000000003';
  const adminId = '20000000-0000-0000-0000-000000000004';

  const studentToken = createToken('student', studentId);
  const counselorToken = createToken('counselor', counselorId);
  const otherCounselorToken = createToken('counselor', otherCounselorId);
  const adminToken = createToken('admin', adminId);

  async function createTask(token: string, payload: object) {
    return request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send(payload);
  }

  beforeAll(async () => {
    if (!DATABASE_URL) return;
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // 清理历史测试数据
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST TASK%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST TASK%'");
    await client.query(`DELETE FROM counselor_classes WHERE counselor_id IN ('${counselorId}', '${otherCounselorId}')`);
    await client.query(`DELETE FROM users WHERE id IN ('${studentId}', '${counselorId}', '${otherCounselorId}', '${adminId}')`);
    await client.query(`DELETE FROM classes WHERE id IN ('${classId}', '${otherClassId}')`);
    await client.query(`DELETE FROM colleges WHERE id = '${collegeId}'`);

    // 创建学院、班级、用户
    await client.query('INSERT INTO colleges (id, name) VALUES ($1, $2)', [collegeId, 'TEST 马克思主义学院']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [classId, collegeId, 'TEST 思政一班']);
    await client.query('INSERT INTO classes (id, college_id, name) VALUES ($1, $2, $3)', [otherClassId, collegeId, 'TEST 思政二班']);

    await seedUser(client, studentId, 'TASK_S001', 'student', classId);
    await seedUser(client, counselorId, 'TASK_T001', 'counselor', null);
    await seedUser(client, otherCounselorId, 'TASK_T002', 'counselor', null);
    await seedUser(client, adminId, 'TASK_A001', 'admin', null);

    await client.query('INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)', [counselorId, classId]);
  });

  afterEach(async () => {
    if (!client) return;
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST TASK%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST TASK%'");
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  describe('POST /api/tasks', () => {
    const basePayload = {
      title: 'TEST TASK 示例任务',
      content: '任务内容',
      scope_type: 'class',
      target_class_id: classId,
      published_at: new Date(Date.now() - 1000).toISOString(),
      deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    it('allows admin to create a school task', async () => {
      const res = await createTask(adminToken, { ...basePayload, scope_type: 'school', target_class_id: null });
      expect(res.status).toBe(201);
      expect(res.body.data.scope_label).toBe('全校');
    });

    it('allows admin to create a college task', async () => {
      const res = await createTask(adminToken, {
        ...basePayload,
        scope_type: 'college',
        target_class_id: null,
        target_college_id: collegeId,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.scope_label).toBe('学院');
    });

    it('allows counselor to create task for their own class', async () => {
      const res = await createTask(counselorToken, basePayload);
      expect(res.status).toBe(201);
      expect(res.body.data.created_by).toBe(counselorId);
    });

    it('rejects counselor creating school/college task', async () => {
      const schoolRes = await createTask(counselorToken, {
        ...basePayload,
        scope_type: 'school',
        target_class_id: null,
      });
      expect(schoolRes.status).toBe(403);

      const collegeRes = await createTask(counselorToken, {
        ...basePayload,
        scope_type: 'college',
        target_class_id: null,
        target_college_id: collegeId,
      });
      expect(collegeRes.status).toBe(403);
    });

    it('rejects counselor creating task for unmanaged class', async () => {
      const res = await createTask(counselorToken, { ...basePayload, target_class_id: otherClassId });
      expect(res.status).toBe(403);
    });

    it('rejects student creating task', async () => {
      const res = await createTask(studentToken, basePayload);
      expect(res.status).toBe(403);
    });

    it('rejects invalid payload', async () => {
      const res = await createTask(adminToken, { ...basePayload, title: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects deadline before published_at', async () => {
      const res = await createTask(adminToken, {
        ...basePayload,
        published_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        deadline_at: new Date(Date.now()).toISOString(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks (admin/counselor)', () => {
    it('lists tasks created by counselor', async () => {
      await createTask(counselorToken, {
        title: 'TEST TASK 辅导员任务',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${counselorToken}`);
      expect(res.status).toBe(200);
      // P3: 返回结构改为 { items, total, page, limit }
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].title).toContain('TEST TASK 辅导员任务');
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);
    });

    it('admin can filter by status', async () => {
      await createTask(adminToken, {
        title: 'TEST TASK 待下架',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const publishedRes = await request(app)
        .get('/api/tasks?status=published')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(publishedRes.status).toBe(200);
      expect(publishedRes.body.data.items.every((t: { status: string }) => t.status === 'published')).toBe(true);
    });

    it('clamps limit to 50 and respects pagination', async () => {
      const res = await request(app)
        .get('/api/tasks?page=1&limit=9999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(50);
      expect(res.body.data.page).toBe(1);
    });

    it('preserves target ids for college/class tasks (P5)', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 学院编辑测试',
        content: '内容',
        scope_type: 'college',
        target_college_id: collegeId,
        target_class_id: null,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(createRes.body.data.target_college_id).toBe(collegeId);
      expect(createRes.body.data.target_class_id).toBeNull();
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('allows creator to edit before deadline', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 可编辑',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'TEST TASK 已编辑' });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('TEST TASK 已编辑');
    });

    it('rejects editing by non-creator (admin cannot edit counselor task)', async () => {
      const createRes = await createTask(counselorToken, {
        title: 'TEST TASK 他人任务',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'TEST TASK 越权编辑' });
      expect(res.status).toBe(403);
    });

    it('rejects editing after deadline', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 已截止',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 2000).toISOString(),
        deadline_at: new Date(Date.now() - 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'TEST TASK 尝试编辑' });
      expect(res.status).toBe(409);
    });

    // P1: status 不再通过 PUT 修改，必须走 delist 端点
    it('rejects status change via update endpoint', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 状态隔离',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delisted' });
      expect(res.status).toBe(400);
    });

    // P7: 服务端 trim 防止纯空白标题
    it('rejects whitespace-only title', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 空白校验',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '     ' });
      expect(res.status).toBe(400);
    });

    // P8: scope 切换时清理无关 target id
    it('clears stale target id when switching scope to school', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK scope 切换',
        content: '内容',
        scope_type: 'college',
        target_college_id: collegeId,
        target_class_id: null,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scope_type: 'school' });
      expect(res.status).toBe(200);
      expect(res.body.data.target_college_id).toBeNull();
      expect(res.body.data.target_class_id).toBeNull();
    });
  });

  describe('PATCH /api/tasks/:id/delist (P1)', () => {
    it('allows creator to delist own task', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 下架',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/delist`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delisted');
    });

    // P1 核心场景：admin 可下架 counselor 创建的任务（之前会 403）
    it('allows admin to delist counselor-created task', async () => {
      const createRes = await createTask(counselorToken, {
        title: 'TEST TASK 跨角色下架',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/delist`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delisted');
    });

    // P1: 非创建人的 counselor 不能下架其他 counselor 的任务
    it('rejects other counselor from delisting peer task', async () => {
      const createRes = await createTask(counselorToken, {
        title: 'TEST TASK 同事下架',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/delist`)
        .set('Authorization', `Bearer ${otherCounselorToken}`);
      expect(res.status).toBe(403);
    });

    // P1: 下架不受截止时间限制（区别于编辑）
    it('allows delisting after deadline', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 截止后下架',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 2000).toISOString(),
        deadline_at: new Date(Date.now() - 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/delist`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delisted');
    });

    it('rejects delisting already-delisted task', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 重复下架',
        content: '内容',
        scope_type: 'school',
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      await request(app)
        .patch(`/api/tasks/${taskId}/delist`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/delist`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/tasks/my', () => {
    it('returns assigned tasks for student', async () => {
      await createTask(adminToken, {
        title: 'TEST TASK 学生任务',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const res = await request(app).get('/api/tasks/my').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe('in_progress');
    });

    it('hides delisted tasks from student', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 已下架',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;
      await request(app).patch(`/api/tasks/${taskId}/delist`).set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app).get('/api/tasks/my').set('Authorization', `Bearer ${studentToken}`);
      expect(res.body.data.every((t: { title: string }) => !t.title.includes('TEST TASK 已下架'))).toBe(true);
    });

    it('marks approved check_in as completed', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 已完成',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;
      await client.query('INSERT INTO check_ins (task_id, user_id, status) VALUES ($1, $2, $3)', [
        taskId,
        studentId,
        'approved',
      ]);

      const res = await request(app).get('/api/tasks/my').set('Authorization', `Bearer ${studentToken}`);
      const task = res.body.data.find((t: { title: string }) => t.title.includes('TEST TASK 已完成'));
      expect(task).toBeDefined();
      expect(task.status).toBe('completed');
    });

    it('marks submitted check_in as reviewing', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 审核中',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;
      await client.query('INSERT INTO check_ins (task_id, user_id, status) VALUES ($1, $2, $3)', [
        taskId,
        studentId,
        'submitted',
      ]);

      const res = await request(app).get('/api/tasks/my').set('Authorization', `Bearer ${studentToken}`);
      const task = res.body.data.find((t: { title: string }) => t.title.includes('TEST TASK 审核中'));
      expect(task).toBeDefined();
      expect(task.status).toBe('reviewing');
    });

    it('marks overdue task correctly', async () => {
      await createTask(adminToken, {
        title: 'TEST TASK 已逾期',
        content: '内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 2000).toISOString(),
        deadline_at: new Date(Date.now() - 1000).toISOString(),
      });

      const res = await request(app).get('/api/tasks/my').set('Authorization', `Bearer ${studentToken}`);
      const task = res.body.data.find((t: { title: string }) => t.title.includes('TEST TASK 已逾期'));
      expect(task).toBeDefined();
      expect(task.status).toBe('overdue');
    });
  });

  describe('GET /api/tasks/my/:id', () => {
    it('returns task detail for assigned student', async () => {
      const createRes = await createTask(adminToken, {
        title: 'TEST TASK 详情',
        content: '详情内容',
        scope_type: 'class',
        target_class_id: classId,
        published_at: new Date(Date.now() - 1000).toISOString(),
        deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const taskId = createRes.body.data.id;

      const res = await request(app).get(`/api/tasks/my/${taskId}`).set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('TEST TASK 详情');
      expect(res.body.data.content).toBe('详情内容');
    });
  });
});
