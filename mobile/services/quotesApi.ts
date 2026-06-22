import { request } from './api';

export interface Quote {
  id: string;
  content: string;
  author: string | null;
  source: string | null;
}

export async function getDailyQuote(date?: string): Promise<Quote> {
  const path = date ? `/api/quotes/daily?date=${encodeURIComponent(date)}` : '/api/quotes/daily';
  const result = await request<Quote>(path);

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取每日名言失败');
  }

  return result.data;
}
