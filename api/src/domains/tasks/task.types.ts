import type { TaskTemplateCategory, CheckinType } from '../task-templates/task-templates.types.js';

export type TaskScopeType = 'school' | 'college' | 'class';
export type TaskStatus = 'published' | 'delisted';
export type CheckInStatus =
  | 'submitted'
  | 'ai_reviewing'
  | 'ai_approved'
  | 'pending_manual_review'
  | 'approved'
  | 'rejected'
  | 'requires_modification';

export type StudentTaskStatus = 'in_progress' | 'overdue' | 'completed' | 'reviewing';

export interface Task {
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
  checkin_type: CheckinType;
  require_text: boolean;
  require_image: boolean;
  require_video: boolean;
  min_text_length: number | null;
  max_images: number | null;
  require_location: boolean;
  scope_type: TaskScopeType;
  scope_id: string | null;
  target_college_id: string | null;
  target_class_id: string | null;
  template_id: string | null; // 从任务模板派生的实例
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
  created_by: string;
  published_at: string;
  deadline_at: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskResponse extends Task {
  scope_label: string;
}

export interface StudentTask {
  id: string;
  title: string;
  content: string;
  published_at: string;
  deadline_at: string;
  status: StudentTaskStatus;
  completed_at?: string;
}

export interface TaskDetail extends StudentTask {
  check_in_id?: string;
  check_in_status?: CheckInStatus;
  reflection_content?: string;
  ai_review_reason?: string;
  ai_review_reason_code?: string;
  reflection_modified?: boolean;
  review_feedback?: string;
  description?: string | null;
  cover_image?: string | null;
  category?: TaskTemplateCategory | null;
  tags?: string[] | null;
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
}

export interface TaskWithStats extends TaskResponse {
  total_assignees: number;
  completed_count: number;
  completion_rate: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  content: string;
  cover_image?: string | null;
  category?: TaskTemplateCategory | null;
  tags?: string[] | null;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  checkin_type?: CheckinType;
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
  min_text_length?: number | null;
  max_images?: number | null;
  require_location?: boolean;
  scope_type: TaskScopeType;
  scope_id?: string | null;
  target_college_id?: string | null;
  target_class_id?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  published_at: string;
  deadline_at: string;
}

export interface CreateTaskFromTemplateInput {
  template_id: string;
  scope_type: TaskScopeType;
  scope_id?: string | null;
  target_class_ids?: string[];
  published_at: string;
  deadline_at: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  content?: string;
  cover_image?: string | null;
  category?: TaskTemplateCategory | null;
  tags?: string[] | null;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  checkin_type?: CheckinType;
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
  min_text_length?: number | null;
  max_images?: number | null;
  require_location?: boolean;
  scope_type?: TaskScopeType;
  scope_id?: string | null;
  target_college_id?: string | null;
  target_class_id?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
  published_at?: string;
  deadline_at?: string;
  status?: TaskStatus;
}

export interface TaskFilters {
  status?: TaskStatus;
  scopeType?: TaskScopeType;
}
