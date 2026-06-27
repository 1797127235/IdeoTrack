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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LearningResourceResponse {
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

export interface CreateLearningResourceInput {
  title: string;
  description?: string | null;
  type: LearningResourceType;
  content?: string | null;
  url?: string | null;
  cover_url?: string | null;
  category?: string | null;
  tags?: string[] | null;
  status?: LearningResourceStatus;
}

export interface UpdateLearningResourceInput {
  title?: string;
  description?: string | null;
  type?: LearningResourceType;
  content?: string | null;
  url?: string | null;
  cover_url?: string | null;
  category?: string | null;
  tags?: string[] | null;
  status?: LearningResourceStatus;
}

export interface LearningResourceFilters {
  type?: LearningResourceType;
  category?: string;
  status?: LearningResourceStatus;
}
