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

export interface DailyQuote {
  id: string;
  quote_id: string;
  date: string;
  created_at: string;
}

export interface QuoteResponse {
  id: string;
  content: string;
  author: string | null;
  source: string | null;
}
