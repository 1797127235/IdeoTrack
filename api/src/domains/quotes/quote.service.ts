import { supabase } from '../../lib/supabase.js';
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
  const { data: existingDaily, error: dailyError } = await supabase
    .from('daily_quotes')
    .select('quote_id, quotes(*)')
    .eq('date', dateStr)
    .single();

  if (dailyError && dailyError.code !== 'PGRST116') {
    throw new AppError('QUOTE_SERVICE_ERROR', '获取每日名言失败', 500);
  }

  if (existingDaily?.quotes) {
    return toResponse(existingDaily.quotes as unknown as Quote);
  }

  // 2. 获取启用名言列表
  const { data: enabledQuotes, error: quotesError } = await supabase
    .from('quotes')
    .select('*')
    .eq('is_enabled', true)
    .order('display_order', { ascending: true });

  if (quotesError) {
    throw new AppError('QUOTE_SERVICE_ERROR', '获取名言库失败', 500);
  }

  if (!enabledQuotes || enabledQuotes.length === 0) {
    return FALLBACK_QUOTE;
  }

  // 3. 按日期确定性选择名言，避免并发竞态
  const selectedIndex = simpleHash(dateStr) % enabledQuotes.length;
  const selectedQuote = enabledQuotes[selectedIndex];

  // 4. 尝试写入当日记录；若已存在则忽略冲突
  await supabase
    .from('daily_quotes')
    .insert({ quote_id: selectedQuote.id, date: dateStr })
    .select()
    .single();

  return toResponse(selectedQuote);
}

export async function listQuotes(filters: QuoteFilters = {}): Promise<Quote[]> {
  let query = supabase.from('quotes').select('*').order('display_order', { ascending: true });

  if (typeof filters.is_enabled === 'boolean') {
    query = query.eq('is_enabled', filters.is_enabled);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError('QUOTE_SERVICE_ERROR', '获取名言列表失败', 500);
  }

  return (data || []) as Quote[];
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const { data: maxOrderData, error: maxOrderError } = await supabase
    .from('quotes')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  if (maxOrderError && maxOrderError.code !== 'PGRST116') {
    throw new AppError('QUOTE_SERVICE_ERROR', '获取名言排序失败', 500);
  }

  const displayOrder =
    typeof input.display_order === 'number'
      ? input.display_order
      : (maxOrderData?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      content: input.content,
      author: input.author ?? null,
      source: input.source ?? null,
      is_enabled: input.is_enabled ?? true,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError('QUOTE_SERVICE_ERROR', '创建名言失败', 500);
  }

  return data as Quote;
}

export async function updateQuote(id: string, input: UpdateQuoteInput): Promise<Quote> {
  const { data: existing } = await supabase.from('quotes').select('id').eq('id', id).single();

  if (!existing) {
    throw new AppError('QUOTE_NOT_FOUND', '名言不存在', 404);
  }

  const updatePayload: Record<string, unknown> = {};

  if (input.content !== undefined) updatePayload.content = input.content;
  if (input.author !== undefined) updatePayload.author = input.author;
  if (input.source !== undefined) updatePayload.source = input.source;
  if (input.is_enabled !== undefined) updatePayload.is_enabled = input.is_enabled;
  if (input.display_order !== undefined) updatePayload.display_order = input.display_order;

  const { data, error } = await supabase
    .from('quotes')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('QUOTE_SERVICE_ERROR', '更新名言失败', 500);
  }

  return data as Quote;
}

export async function deleteQuote(id: string): Promise<void> {
  const { data: existing } = await supabase.from('quotes').select('id').eq('id', id).single();

  if (!existing) {
    throw new AppError('QUOTE_NOT_FOUND', '名言不存在', 404);
  }

  const { data: references } = await supabase
    .from('daily_quotes')
    .select('id')
    .eq('quote_id', id)
    .limit(1)
    .single();

  if (references) {
    throw new AppError(
      'QUOTE_IN_USE',
      '该名言已被用于历史每日记录，无法删除。建议先禁用它。',
      409
    );
  }

  const { error } = await supabase.from('quotes').delete().eq('id', id);

  if (error) {
    throw new AppError('QUOTE_SERVICE_ERROR', '删除名言失败', 500);
  }
}
