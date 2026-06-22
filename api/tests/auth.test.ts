import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import app from '../src/index.js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

describe.skipIf(!DATABASE_URL)('Auth API', () => {
  let client: Client;
  const testSchoolId = '2024001';
  const testPassword = '240001'; // 学号后 6 位

  beforeAll(async () => {
    if (!DATABASE_URL) return;

    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // Clean users before seeding
    await client.query('DELETE FROM counselor_classes');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM classes');
    await client.query('DELETE FROM colleges');

    // Seed a test user
    const college = await client.query(
      "INSERT INTO colleges (name) VALUES ('测试学院') RETURNING id"
    );
    const collegeId = college.rows[0].id;

    const classResult = await client.query(
      'INSERT INTO classes (college_id, name) VALUES ($1, $2) RETURNING id',
      [collegeId, '测试班级']
    );
    const classId = classResult.rows[0].id;

    const passwordHash = await bcrypt.hash(testPassword, 10);

    await client.query(
      `INSERT INTO users (school_id, password_hash, role, is_initial_password, class_id)
       VALUES ($1, $2, 'student', true, $3)`,
      [testSchoolId, passwordHash, classId]
    );
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('returns token and user info for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.isInitialPassword).toBe(true);
  });

  it('returns 401 for invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      schoolId: '9999999',
      password: 'anypassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('locks account after 5 failed attempts', async () => {
    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    }

    // 5th failed attempt should trigger lock
    const fifthRes = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: 'wrongpassword',
    });
    expect(fifthRes.status).toBe(403);
    expect(fifthRes.body.error.code).toBe('AUTH_ACCOUNT_LOCKED');

    // Subsequent attempts should be locked
    const lockedRes = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: testPassword,
    });
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.error.code).toBe('AUTH_ACCOUNT_LOCKED');
  });
});
