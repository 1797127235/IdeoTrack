import { api } from "./api";

export interface Quote {
  id: string;
  content: string;
  author: string | null;
  source: string | null;
  is_enabled: boolean;
  display_order: number;
}

export const listQuotes = () => api.get<Quote[]>("/quotes");
export const createQuote = (data: {
  content: string;
  author?: string;
  source?: string;
  is_enabled?: boolean;
}) => api.post<Quote>("/quotes", data);
export const updateQuote = (
  id: string,
  data: {
    content?: string;
    author?: string;
    source?: string;
    is_enabled?: boolean;
  }
) => api.put<Quote>(`/quotes/${id}`, data);
export const deleteQuote = (id: string) =>
  api.delete<{ id: string }>(`/quotes/${id}`);
