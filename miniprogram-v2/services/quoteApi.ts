import { get } from './api';

export interface Quote {
  id: string;
  content: string;
  author: string | null;
  source: string | null;
}

export async function getDailyQuote(date?: string): Promise<Quote> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const result = await get<Quote>(`/api/quotes/daily${query}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取每日名言失败');
  }
  return result.data;
}
