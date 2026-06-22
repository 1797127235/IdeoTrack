import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../middleware/error-handler.js';
import type { Quote, QuoteResponse } from './quote.types.js';

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

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getDailyQuote(dateStr?: string): Promise<QuoteResponse> {
  const date = dateStr || getTodayDate();

  // 1. 检查是否已有当日记录
  const { data: existingDaily, error: dailyError } = await supabase
    .from('daily_quotes')
    .select('quote_id, quotes(*)')
    .eq('date', date)
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

  // 3. 轮询选择下一条
  const { count } = await supabase
    .from('daily_quotes')
    .select('*', { count: 'exact', head: true });

  const historyCount = count || 0;
  const selectedIndex = historyCount % enabledQuotes.length;
  const selectedQuote = enabledQuotes[selectedIndex];

  // 4. 写入当日记录（忽略并发冲突）
  await supabase
    .from('daily_quotes')
    .insert({ quote_id: selectedQuote.id, date })
    .select()
    .single();

  return toResponse(selectedQuote);
}
