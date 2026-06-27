import { get } from './api';
import { API_BASE_URL } from './api';

export type LearningResourceType = 'article' | 'video' | 'document' | 'link';
export type LearningResourceStatus = 'draft' | 'published';

export interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  type: LearningResourceType;
  content: string | null;
  url: string | null;
  cover_url: string | null;
  category: string | null;
  tags: string[] | null;
  status: LearningResourceStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListLearningResourcesResponse {
  items: LearningResource[];
  total: number;
  page: number;
  limit: number;
}

export interface LearningResourceFilters {
  type?: LearningResourceType;
  category?: string;
  status?: LearningResourceStatus;
  page?: number;
  limit?: number;
}

export async function listLearningResources(filters: LearningResourceFilters = {}) {
  const params: string[] = [];
  if (filters.type) params.push(`type=${encodeURIComponent(filters.type)}`);
  if (filters.category) params.push(`category=${encodeURIComponent(filters.category)}`);
  if (filters.status) params.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters.page) params.push(`page=${filters.page}`);
  if (filters.limit) params.push(`limit=${filters.limit}`);

  const query = params.join('&');
  const path = query ? `/api/learning-resources?${query}` : '/api/learning-resources';
  return get<ListLearningResourcesResponse>(path);
}

export async function getLearningResource(id: string) {
  return get<LearningResource>(`/api/learning-resources/${id}`);
}

export function getCoverUrl(id: string) {
  return `${API_BASE_URL}/api/learning-resources/${id}/cover`;
}

export function typeLabel(type: LearningResourceType): string {
  const map: Record<LearningResourceType, string> = {
    article: '文章',
    video: '视频',
    document: '文档',
    link: '链接',
  };
  return map[type];
}
