import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import { config } from '../src/config/index.js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

describe.skipIf(!DATABASE_URL)('Wechat Auth API (Story 12.3)', () => {
  let client: Client;
  const schoolId = 'WX_STU_001';
  const password = 'wxtest1';
  const testOpenid = 'test-openid-abc-123';

  async function seedStudent() {
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO users (school_id, password_hash, role, is_initial_password)
       VALUES ($1, $2, 'student', true)
       ON CONFLICT (school_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [schoolId, passwordHash]
    );
  }

  beforeAll(async () => {
    if (!DATABASE_URL) return;
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query("DELETE FROM users WHERE school_id = $1", [schoolId]);
    await seedStudent();
  });

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM users WHERE school_id = $1", [schoolId]);
    await client.end();
  });

  describe('POST /api/auth/wechat/login', () => {
    it('rejects missing code', async () => {
      const res = await request(app).post('/api/auth/wechat/login').send({});
      expect(res.status).toBe(400);
    });

    it('returns 500 with not-configured error when wechat creds absent', async () => {
      // 如果环境没配 WECHAT_APP_ID，调用真实微信会失败
      // 这里验证：缺配置时返回 AUTH_WECHAT_NOT_CONFIGURED，而不是崩溃
      if (config.wechatAppId && config.wechatAppSecret) {
        // 已配置环境跳过此测试
        return;
      }
      const res = await request(app)
        .post('/api/auth/wechat/login')
        .send({ code: 'any-fake-code' });
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('AUTH_WECHAT_NOT_CONFIGURED');
    });
  });

  describe('POST /api/auth/wechat/bind', () => {
    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/wechat/bind')
        .send({ openid: testOpenid });
      expect(res.status).toBe(400);
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/wechat/bind')
        .send({ openid: testOpenid, schoolId, password: 'wrong-pass' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('rejects non-existent student', async () => {
      const res = await request(app)
        .post('/api/auth/wechat/bind')
        .send({ openid: testOpenid, schoolId: 'NOT_EXIST_999', password });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('binds openid and returns JWT for valid student', async () => {
      const res = await request(app)
        .post('/api/auth/wechat/bind')
        .send({ openid: testOpenid, schoolId, password });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.role).toBe('student');

      // 验证 JWT 解码后 claims 正确
      const payload = jwt.verify(res.body.data.token, config.jwtSecret) as {
        userId: string;
        role: string;
      };
      expect(payload.role).toBe('student');
    });

    it('reflects bound openid in database', async () => {
      const result = await client.query(
        'SELECT wechat_openid FROM users WHERE school_id = $1',
        [schoolId]
      );
      expect(result.rows[0].wechat_openid).toBe(testOpenid);
    });

    it('re-binding with a new openid unbinds the old one', async () => {
      const newOpenid = 'new-openid-xyz-789';
      const res = await request(app)
        .post('/api/auth/wechat/bind')
        .send({ openid: newOpenid, schoolId, password });
      expect(res.status).toBe(200);

      // 旧 openid 应已被解绑（全局唯一，新绑定占位）
      const result = await client.query(
        'SELECT wechat_openid FROM users WHERE school_id = $1',
        [schoolId]
      );
      expect(result.rows[0].wechat_openid).toBe(newOpenid);
    });
  });
});
