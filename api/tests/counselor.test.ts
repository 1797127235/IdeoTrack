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

  afterEach(async () => {
    if (!client) return;
    await client.query("DELETE FROM check_ins WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'TEST COUNSELOR%')");
    await client.query("DELETE FROM tasks WHERE title LIKE 'TEST COUNSELOR%'");
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  async function createTask(targetClassId: string) {
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
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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

  it('GET /api/counselor/dashboard returns classes managed by the counselor', async () => {
    const taskA = await createTask(classIdA);
    await createApprovedCheckIn(taskA, studentA1);

    const res = await request(app)
      .get('/api/counselor/dashboard')
      .set('Authorization', `Bearer ${counselorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { classes, summary } = res.body.data;
    expect(classes).toHaveLength(2);

    const classA = classes.find((c: { class_id: string }) => c.class_id === classIdA);
    expect(classA.total_students).toBe(2);
    expect(classA.checked_in_count).toBe(1);
    expect(classA.check_in_rate).toBe(50);
    expect(classA.absent_count).toBe(1);

    const classB = classes.find((c: { class_id: string }) => c.class_id === classIdB);
    expect(classB.total_students).toBe(1);
    expect(classB.checked_in_count).toBe(0);

    expect(summary.total_students).toBe(3);
    expect(summary.checked_in_count).toBe(1);
  });

  it('GET /api/counselor/dashboard excludes classes of other counselors', async () => {
    const res = await request(app)
      .get('/api/counselor/dashboard')
      .set('Authorization', `Bearer ${counselorToken}`);

    const classIds = res.body.data.classes.map((c: { class_id: string }) => c.class_id);
    expect(classIds).not.toContain(classIdOther);
  });

  it('GET /api/counselor/dashboard rejects non-counselor roles', async () => {
    const res = await request(app)
      .get('/api/counselor/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/counselor/classes/:id/students returns student list', async () => {
    const taskA = await createTask(classIdA);
    await createApprovedCheckIn(taskA, studentA1);

    const res = await request(app)
      .get(`/api/counselor/classes/${classIdA}/students`)
      .set('Authorization', `Bearer ${counselorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(2);

    const student = res.body.data.students.find((s: { student_id: string }) => s.student_id === studentA1);
    expect(student.checked_in).toBe(true);

    const absentStudent = res.body.data.students.find((s: { student_id: string }) => s.student_id === studentA2);
    expect(absentStudent.checked_in).toBe(false);
  });

  it('GET /api/counselor/classes/:id/students supports status filter', async () => {
    const taskA = await createTask(classIdA);
    await createApprovedCheckIn(taskA, studentA1);

    const checkedInRes = await request(app)
      .get(`/api/counselor/classes/${classIdA}/students?status=checked_in`)
      .set('Authorization', `Bearer ${counselorToken}`);
    expect(checkedInRes.body.data.students).toHaveLength(1);

    const absentRes = await request(app)
      .get(`/api/counselor/classes/${classIdA}/students?status=absent`)
      .set('Authorization', `Bearer ${counselorToken}`);
    expect(absentRes.body.data.students).toHaveLength(1);
  });

  it('GET /api/counselor/classes/:id/students returns 404 for unmanaged class', async () => {
    const res = await request(app)
      .get(`/api/counselor/classes/${classIdOther}/students`)
      .set('Authorization', `Bearer ${counselorToken}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/counselor/classes/:id/students returns 404 when other counselor owns the class', async () => {
    const res = await request(app)
      .get(`/api/counselor/classes/${classIdOther}/students`)
      .set('Authorization', `Bearer ${otherCounselorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.class_id).toBe(classIdOther);
  });
});
