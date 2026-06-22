import { request } from './api';

export interface Quote {
  id: string;
  content: string;
  author: string | null;
  source: string | null;
  is_enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteInput {
  content: string;
  author?: string | null;
  source?: string | null;
  is_enabled?: boolean;
  display_order?: number;
}

export interface UpdateQuoteInput {
  content?: string;
  author?: string | null;
  source?: string | null;
  is_enabled?: boolean;
  display_order?: number;
}

export async function listQuotes(): Promise<Quote[]> {
  const result = await request<Quote[]>('/api/quotes');

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取名言列表失败');
  }

  return result.data;
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const result = await request<Quote>('/api/quotes', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '创建名言失败');
  }

  return result.data;
}

export async function updateQuote(id: string, input: UpdateQuoteInput): Promise<Quote> {
  const result = await request<Quote>(`/api/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '更新名言失败');
  }

  return result.data;
}

export async function deleteQuote(id: string): Promise<void> {
  const result = await request<null>(`/api/quotes/${id}`, {
    method: 'DELETE',
  });

  if (!result.success) {
    throw new Error(result.error?.message || '删除名言失败');
  }
}
