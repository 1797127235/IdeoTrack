import { query, queryOne } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  Quote,
  QuoteResponse,
  CreateQuoteInput,
  UpdateQuoteInput,
  QuoteFilters,
} from './quote.types.js';

const FALLBACK_QUOTE: QuoteResponse = {
  id: 'fallback',
  content: '路虽远，行则将至；事虽难，做则必成。',
  author: '荀子',
  source: '《荀子·修身》',
};

function toResponse(quote: Quote): QuoteResponse {
  return {
    id: quote.id,
    content: quote.content,
    author: quote.author,
    source: quote.source,
  };
}

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function getDailyQuote(dateStr: string): Promise<QuoteResponse> {
  // 1. 检查是否已有当日记录
  const existingDaily = await queryOne<{
    id: string;
    content: string;
    author: string;
    source: string;
  }>(
    `SELECT dq.quote_id AS id, q.content, q.author, q.source
     FROM daily_quotes dq
     JOIN quotes q ON dq.quote_id = q.id
     WHERE dq.date = $1
     LIMIT 1`,
    [dateStr]
  );

  if (existingDaily) {
    return toResponse(existingDaily as Quote);
  }

  // 2. 获取启用名言列表
  const enabledQuotes = await query<Quote>(
    `SELECT * FROM quotes
     WHERE is_enabled = true
     ORDER BY display_order ASC`
  );

  if (enabledQuotes.length === 0) {
    return FALLBACK_QUOTE;
  }

  // 3. 按日期确定性选择名言，避免并发竞态
  const selectedIndex = simpleHash(dateStr) % enabledQuotes.length;
  const selectedQuote = enabledQuotes[selectedIndex];

  // 4. 尝试写入当日记录；若已存在则忽略冲突
  await query(
    `INSERT INTO daily_quotes (quote_id, date)
     VALUES ($1, $2)
     ON CONFLICT (date) DO NOTHING`,
    [selectedQuote.id, dateStr]
  );

  return toResponse(selectedQuote);
}

export async function listQuotes(filters: QuoteFilters = {}): Promise<Quote[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (typeof filters.is_enabled === 'boolean') {
    conditions.push(`is_enabled = $${paramIndex}`);
    params.push(filters.is_enabled);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return query<Quote>(
    `SELECT * FROM quotes
     ${whereClause}
     ORDER BY display_order ASC`,
    params
  );
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const maxOrderRow = await queryOne<{ display_order: number }>(
    `SELECT display_order FROM quotes
     ORDER BY display_order DESC
     LIMIT 1`
  );

  const displayOrder =
    typeof input.display_order === 'number'
      ? input.display_order
      : (maxOrderRow?.display_order ?? -1) + 1;

  const rows = await query<Quote>(
    `INSERT INTO quotes (content, author, source, is_enabled, display_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.content,
      input.author ?? null,
      input.source ?? null,
      input.is_enabled ?? true,
      displayOrder,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('QUOTE_SERVICE_ERROR', '创建名言失败', 500);
  }

  return rows[0];
}

export async function updateQuote(id: string, input: UpdateQuoteInput): Promise<Quote> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM quotes WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!existing) {
    throw new AppError('QUOTE_NOT_FOUND', '名言不存在', 404);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  function addSet(column: string, value: unknown) {
    updates.push(`${column} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  if (input.content !== undefined) addSet('content', input.content);
  if (input.author !== undefined) addSet('author', input.author);
  if (input.source !== undefined) addSet('source', input.source);
  if (input.is_enabled !== undefined) addSet('is_enabled', input.is_enabled);
  if (input.display_order !== undefined) addSet('display_order', input.display_order);

  if (updates.length === 0) {
    const quote = await queryOne<Quote>('SELECT * FROM quotes WHERE id = $1 LIMIT 1', [id]);
    if (!quote) {
      throw new AppError('QUOTE_NOT_FOUND', '名言不存在', 404);
    }
    return quote;
  }

  params.push(id);
  const rows = await query<Quote>(
    `UPDATE quotes
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (rows.length === 0) {
    throw new AppError('QUOTE_SERVICE_ERROR', '更新名言失败', 500);
  }

  return rows[0];
}

export async function deleteQuote(id: string): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM quotes WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!existing) {
    throw new AppError('QUOTE_NOT_FOUND', '名言不存在', 404);
  }

  const reference = await queryOne<{ id: string }>(
    'SELECT id FROM daily_quotes WHERE quote_id = $1 LIMIT 1',
    [id]
  );

  if (reference) {
    throw new AppError(
      'QUOTE_IN_USE',
      '该名言已被用于历史每日记录，无法删除。建议先禁用它。',
      409
    );
  }

  await query('DELETE FROM quotes WHERE id = $1', [id]);
}
