export type TaskTemplateStatus = 'draft' | 'published' | 'delisted';
export type TaskTemplateCategory = '学习' | '实践' | '活动' | '会议' | '阅读';
export type CheckinType = 'text' | 'image' | 'video' | 'mixed';

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  content: string;
  cover_image: string | null;
  category: TaskTemplateCategory | null;
  tags: string[] | null;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  attachment_url: string | null;
  checkin_type: CheckinType;
  require_text: boolean;
  require_image: boolean;
  require_video: boolean;
  min_text_length: number | null;
  max_images: number | null;
  require_location: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
  created_by: string;
  status: TaskTemplateStatus;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateResponse extends TaskTemplate {}

export interface CreateTaskTemplateInput {
  title: string;
  description?: string | null;
  content: string;
  cover_image?: string | null;
  category?: TaskTemplateCategory | null;
  tags?: string[] | null;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  attachment_url?: string | null;
  checkin_type?: CheckinType;
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
  min_text_length?: number | null;
  max_images?: number | null;
  require_location?: boolean;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  status?: TaskTemplateStatus;
  start_time?: string | null;
  end_time?: string | null;
}

export interface UpdateTaskTemplateInput {
  title?: string;
  description?: string | null;
  content?: string;
  cover_image?: string | null;
  category?: TaskTemplateCategory | null;
  tags?: string[] | null;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  attachment_url?: string | null;
  checkin_type?: CheckinType;
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
  min_text_length?: number | null;
  max_images?: number | null;
  require_location?: boolean;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  status?: TaskTemplateStatus;
  start_time?: string | null;
  end_time?: string | null;
}

export interface TaskTemplateFilters {
  status?: TaskTemplateStatus;
}
