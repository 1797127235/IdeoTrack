import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';

vi.setConfig({ testTimeout: 10000 });
import request from 'supertest';
import { Client } from 'pg';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import { config } from '../src/config/index.js';

const DATABASE_URL = process.env.TEST_DATABASE_URL;

function createToken(role: 'student' | 'admin', userId = '00000000-0000-0000-0000-000000000000'): string {
  return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: '1h' });
}

describe.skipIf(!DATABASE_URL)('Quotes API', () => {
  let client: Client;
  const adminToken = createToken('admin');
  const studentToken = createToken('student');
  const testQuoteIds: string[] = [];

  async function seedQuotes() {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO quotes (content, author, source, is_enabled, display_order)
       VALUES
         ('TEST 路虽远，行则将至；事虽难，做则必成。', 'TEST 荀子', 'TEST 《荀子·修身》', true, 1),
         ('TEST 千里之行，始于足下。', 'TEST 老子', 'TEST 《道德经》', true, 2),
         ('TEST _disabled_ 不启用名言', 'TEST 作者', null, false, 3)
       RETURNING id`
    );
    const ids = inserted.rows.map((r) => r.id);
    testQuoteIds.push(...ids);
    return ids;
  }

  async function cleanupTestQuotes() {
    if (testQuoteIds.length === 0) return;
    const idList = testQuoteIds.map((id) => `'${id}'`).join(',');
    await client.query(`DELETE FROM daily_quotes WHERE quote_id IN (${idList})`);
    await client.query(`DELETE FROM quotes WHERE id IN (${idList})`);
    testQuoteIds.length = 0;
  }

  beforeAll(async () => {
    if (!DATABASE_URL) return;

    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    // 清理历史测试数据（防止上次运行残留）
    await client.query("DELETE FROM daily_quotes WHERE quote_id IN (SELECT id FROM quotes WHERE content LIKE 'TEST %')");
    await client.query("DELETE FROM quotes WHERE content LIKE 'TEST %'");
  });

  afterEach(async () => {
    if (!client) return;
    await cleanupTestQuotes();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  describe('GET /api/quotes/daily', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/quotes/daily');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('rejects invalid date format', async () => {
      const res = await request(app)
        .get('/api/quotes/daily?date=2024-13-01')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects future dates', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const dateStr = future.toISOString().split('T')[0];

      const res = await request(app)
        .get(`/api/quotes/daily?date=${dateStr}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('未来');
    });

    it('returns fallback quote when no enabled quotes', async () => {
      await seedQuotes();
      const testDate = '2020-01-01';
      // 清理该日历史记录，并禁用全部名言
      await client.query('DELETE FROM daily_quotes WHERE date = $1', [testDate]);
      await client.query('UPDATE quotes SET is_enabled = false');

      try {
        const res = await request(app)
          .get(`/api/quotes/daily?date=${testDate}`)
          .set('Authorization', `Bearer ${studentToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe('fallback');
      } finally {
        // 恢复启用，避免影响其他测试
        await client.query('UPDATE quotes SET is_enabled = true');
      }
    });

    it('returns deterministic quote for a date and creates daily_quote row', async () => {
      await seedQuotes();
      const testDate = '2024-01-03';

      const enabledRows = await client.query<{ id: string }>(
        'SELECT id FROM quotes WHERE is_enabled = true'
      );
      const enabledIds = enabledRows.rows.map((r) => r.id);

      const first = await request(app)
        .get(`/api/quotes/daily?date=${testDate}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(first.status).toBe(200);
      expect(first.body.success).toBe(true);
      expect(enabledIds).toContain(first.body.data.id);
      expect(first.body.data.content).toBeDefined();

      // 数据库中应存在当日记录
      const dailyRow = await client.query('SELECT * FROM daily_quotes WHERE date = $1', [testDate]);
      expect(dailyRow.rows).toHaveLength(1);
      expect(dailyRow.rows[0].quote_id).toBe(first.body.data.id);

      // 再次请求应返回同一名言
      const second = await request(app)
        .get(`/api/quotes/daily?date=${testDate}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(second.status).toBe(200);
      expect(second.body.data.id).toBe(first.body.data.id);
    });
  });

  describe('GET /api/quotes', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/quotes');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin requests', async () => {
      const res = await request(app).get('/api/quotes').set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('lists all quotes for admin', async () => {
      await seedQuotes();
      const res = await request(app).get('/api/quotes').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.some((q: { content: string }) => q.content.startsWith('TEST '))).toBe(true);
    });

    it('filters quotes by is_enabled', async () => {
      await seedQuotes();
      const enabled = await request(app)
        .get('/api/quotes?is_enabled=true')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(enabled.status).toBe(200);
      expect(enabled.body.data.every((q: { is_enabled: boolean }) => q.is_enabled)).toBe(true);

      const disabled = await request(app)
        .get('/api/quotes?is_enabled=false')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(disabled.status).toBe(200);
      expect(disabled.body.data.every((q: { is_enabled: boolean }) => !q.is_enabled)).toBe(true);
    });
  });

  describe('POST /api/quotes', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(app).post('/api/quotes').send({ content: '名言' });
      expect(res.status).toBe(401);
    });

    it('rejects non-admin requests', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '名言' });
      expect(res.status).toBe(403);
    });

    it('rejects invalid payload', async () => {
      const missing = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ author: '佚名' });
      expect(missing.status).toBe(400);
      expect(missing.body.error.code).toBe('VALIDATION_ERROR');

      const tooLong = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'x'.repeat(201) });
      expect(tooLong.status).toBe(400);
    });

    it('creates a quote for admin', async () => {
      const res = await request(app).post('/api/quotes').set('Authorization', `Bearer ${adminToken}`).send({
        content: 'TEST 学而时习之，不亦说乎？',
        author: 'TEST 孔子',
        source: 'TEST 《论语》',
        is_enabled: true,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('TEST 学而时习之，不亦说乎？');
      expect(res.body.data.is_enabled).toBe(true);
      expect(typeof res.body.data.display_order).toBe('number');
      testQuoteIds.push(res.body.data.id);
    });
  });

  describe('PUT /api/quotes/:id', () => {
    it('rejects non-admin requests', async () => {
      const ids = await seedQuotes();
      const res = await request(app)
        .put(`/api/quotes/${ids[0]}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: '越权更新' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent quote', async () => {
      const res = await request(app)
        .put('/api/quotes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '更新内容' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('QUOTE_NOT_FOUND');
    });

    it('rejects invalid payload', async () => {
      const ids = await seedQuotes();
      const res = await request(app)
        .put(`/api/quotes/${ids[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates content and toggle is_enabled', async () => {
      const ids = await seedQuotes();
      const id = ids[0];

      const updateRes = await request(app).put(`/api/quotes/${id}`).set('Authorization', `Bearer ${adminToken}`).send({
        content: 'TEST 已更新内容',
        is_enabled: false,
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.content).toBe('TEST 已更新内容');
      expect(updateRes.body.data.is_enabled).toBe(false);

      const row = await client.query('SELECT content, is_enabled FROM quotes WHERE id = $1', [id]);
      expect(row.rows[0].content).toBe('TEST 已更新内容');
      expect(row.rows[0].is_enabled).toBe(false);
    });
  });

  describe('DELETE /api/quotes/:id', () => {
    it('rejects non-admin requests', async () => {
      const ids = await seedQuotes();
      const res = await request(app)
        .delete(`/api/quotes/${ids[0]}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent quote', async () => {
      const res = await request(app)
        .delete('/api/quotes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('QUOTE_NOT_FOUND');
    });

    it('returns 409 when quote is referenced by daily_quotes', async () => {
      const ids = await seedQuotes();
      const id = ids[0];
      await client.query('INSERT INTO daily_quotes (quote_id, date) VALUES ($1, $2)', [id, '2024-01-02']);

      const res = await request(app).delete(`/api/quotes/${id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('QUOTE_IN_USE');
    });

    it('deletes unreferenced quote for admin', async () => {
      const ids = await seedQuotes();
      const id = ids[2]; // disabled, unlikely referenced

      const res = await request(app).delete(`/api/quotes/${id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const row = await client.query('SELECT id FROM quotes WHERE id = $1', [id]);
      expect(row.rows).toHaveLength(0);

      // 避免 afterEach 重复删除
      const index = testQuoteIds.indexOf(id);
      if (index > -1) testQuoteIds.splice(index, 1);
    });
  });
});
