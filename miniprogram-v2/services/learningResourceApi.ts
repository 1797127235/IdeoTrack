import { get, getApiBaseUrl } from './api';

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

export interface LearningResourceListResult {
  items: LearningResource[];
  total: number;
  page: number;
  limit: number;
}

export function listLearningResources(page = 1, limit = 10, status: LearningResourceStatus = 'published') {
  return get<LearningResourceListResult>(`/api/learning-resources?page=${page}&limit=${limit}&status=${status}`);
}

export function getLearningResourceById(id: string) {
  return get<LearningResource>(`/api/learning-resources/${id}`);
}

export function getCoverImageUrl(resource: LearningResource): string | null {
  if (!resource.cover_url) return null;
  if (resource.cover_url.startsWith('http')) return resource.cover_url;
  return `${getApiBaseUrl()}${resource.cover_url.startsWith('/') ? '' : '/'}${resource.cover_url}`;
}
