export type TaskTemplateStatus = 'published' | 'delisted';

export interface TaskTemplate {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
  created_by: string;
  status: TaskTemplateStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateResponse extends TaskTemplate {}

export interface CreateTaskTemplateInput {
  title: string;
  content: string;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
}

export interface UpdateTaskTemplateInput {
  title?: string;
  content?: string;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  status?: TaskTemplateStatus;
}

export interface TaskTemplateFilters {
  status?: TaskTemplateStatus;
}
