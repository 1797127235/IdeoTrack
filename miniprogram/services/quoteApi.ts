import { get } from './api';

export interface Quote {
  id: string;
  content: string;
  author: string | null;
  source: string | null;
}

export async function getDailyQuote(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return get<Quote>(`/api/quotes/daily${query}`);
}
