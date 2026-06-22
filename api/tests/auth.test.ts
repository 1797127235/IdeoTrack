import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import { config } from '../src/config/index.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL;

vi.setConfig({ testTimeout: 30000 });

describe.skipIf(!DATABASE_URL)('Auth API', () => {
  let client: Client;
  const testSchoolId = '2024001';
  const counselorSchoolId = 'T001';
  const adminSchoolId = 'A001';
  const testPassword = '240001'; // 学号后 6 位

  async function seedUser(schoolId: string, role: string, classId: string | null) {
    const passwordHash = await bcrypt.hash(testPassword, 10);
    await client.query(
      `INSERT INTO users (school_id, password_hash, role, is_initial_password, class_id)
       VALUES ($1, $2, $3, true, $4)`,
      [schoolId, passwordHash, role, classId]
    );
  }

  async function loginUser(schoolId: string): Promise<string> {
    const res = await request(app).post('/api/auth/login').send({
      schoolId,
      password: testPassword,
    });
    expect(res.status).toBe(200);
    return res.body.data.token;
  }

  beforeAll(async () => {
    if (!DATABASE_URL) return;

    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // Clean users before seeding
    await client.query('DELETE FROM check_ins');
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM counselor_classes');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM classes');
    await client.query('DELETE FROM colleges');

    // Seed test college and class
    const college = await client.query(
      "INSERT INTO colleges (name) VALUES ('测试学院') RETURNING id"
    );
    const collegeId = college.rows[0].id;

    const classResult = await client.query(
      'INSERT INTO classes (college_id, name) VALUES ($1, $2) RETURNING id',
      [collegeId, '测试班级']
    );
    const classId = classResult.rows[0].id;

    // Seed test users for each role
    await seedUser(testSchoolId, 'student', classId);
    await seedUser(counselorSchoolId, 'counselor', null);
    await seedUser(adminSchoolId, 'admin', null);
  });

  afterEach(async () => {
    if (!client) return;
    const passwordHash = await bcrypt.hash(testPassword, 10);
    for (const schoolId of [testSchoolId, counselorSchoolId, adminSchoolId]) {
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             is_initial_password = true,
             failed_login_attempts = 0,
             locked_until = NULL
         WHERE school_id = $2`,
        [passwordHash, schoolId]
      );
    }
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

    // 5th failed attempt records the lock and still returns invalid credentials.
    const fifthRes = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: 'wrongpassword',
    });
    expect(fifthRes.status).toBe(401);
    expect(fifthRes.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');

    // Subsequent attempts should be locked
    const lockedRes = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: testPassword,
    });
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.error.code).toBe('AUTH_ACCOUNT_LOCKED');
  });

  it('allows login again after the lock duration has passed', async () => {
    // Trigger lock first
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: 'wrongpassword',
      });
    }

    // Simulate that the lock duration has expired
    await client.query(
      'UPDATE users SET locked_until = $1, failed_login_attempts = 5 WHERE school_id = $2',
      [new Date(Date.now() - 60 * 60 * 1000).toISOString(), testSchoolId]
    );

    const res = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('resets failed attempts and lock status on successful login', async () => {
    // Create some failed attempts but do not trigger lock
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: 'wrongpassword',
      });
    }

    const res = await request(app).post('/api/auth/login').send({
      schoolId: testSchoolId,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userResult = await client.query(
      'SELECT failed_login_attempts, locked_until FROM users WHERE school_id = $1',
      [testSchoolId]
    );
    expect(userResult.rows[0].failed_login_attempts).toBe(0);
    expect(userResult.rows[0].locked_until).toBeNull();
  });

  describe('POST /api/auth/change-password', () => {
    const newPassword = 'newpass123';

    it('rejects unauthenticated requests', async () => {
      const res = await request(app).post('/api/auth/change-password').send({
        currentPassword: testPassword,
        newPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('changes password when current password is correct', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: testPassword,
      });
      const token = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Old password should no longer work
      const oldLoginRes = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: testPassword,
      });
      expect(oldLoginRes.status).toBe(401);

      // New password should work
      const newLoginRes = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: newPassword,
      });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.success).toBe(true);
      expect(newLoginRes.body.data.user.isInitialPassword).toBe(false);
    });

    it('rejects change when current password is wrong', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: testPassword,
      });
      const token = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'anothernewpass123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_PASSWORD');
    });

    it('rejects new password shorter than 6 characters', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: testPassword,
      });
      const token = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_WEAK_PASSWORD');
    });

    it('rejects new password equal to current password', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: testPassword,
      });
      const token = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_SAME_PASSWORD');
    });
  });

  describe('GET /api/auth/me and RBAC', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns user info for authenticated requests', async () => {
      const token = await loginUser(testSchoolId);
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();
      expect(res.body.data.role).toBe('student');
    });

    it('issues a token with only userId, role, and exp claims', async () => {
      const res = await request(app).post('/api/auth/login').send({
        schoolId: testSchoolId,
        password: testPassword,
      });
      const token = res.body.data.token;
      const payload = jwt.decode(token) as Record<string, unknown>;

      expect(payload).toBeDefined();
      expect(payload.userId).toBeDefined();
      expect(payload.role).toBe('student');
      expect(payload.exp).toBeDefined();
      expect(payload.password).toBeUndefined();
      expect(payload.password_hash).toBeUndefined();
      expect(payload.school_id).toBeUndefined();
    });

    it('rejects expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000', role: 'student' },
        config.jwtSecret,
        { expiresIn: '-1s' }
      );

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('allows admin-only resource for admin token', async () => {
      const token = await loginUser(adminSchoolId);
      const res = await request(app).get('/api/auth/admin-only').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies admin-only resource for student token', async () => {
      const token = await loginUser(testSchoolId);
      const res = await request(app).get('/api/auth/admin-only').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('denies admin-only resource for counselor token', async () => {
      const token = await loginUser(counselorSchoolId);
      const res = await request(app).get('/api/auth/admin-only').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });
  });
});
