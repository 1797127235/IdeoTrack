import { get, post } from './api';

export type TaskScopeType = 'school' | 'college' | 'class';

export interface Task {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  scope_type: TaskScopeType;
  scope_id: string | null;
  template_id: string | null;
  published_at: string;
  deadline_at: string;
  status: 'published' | 'delisted';
  created_by: string;
  created_at: string;
  updated_at: string;
}

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
  status: 'published' | 'delisted';
  created_at: string;
  updated_at: string;
}

export interface StudentTask {
  id: string;
  title: string;
  content: string;
  published_at: string;
  deadline_at: string;
  status: 'in_progress' | 'overdue' | 'completed' | 'reviewing';
  completed_at?: string;
}

export interface TaskDetail extends StudentTask {
  content: string;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  check_in_id?: string;
  check_in_status?: string;
  reflection_content?: string;
  ai_review_reason?: string;
  ai_review_reason_code?: string;
  reflection_modified?: boolean;
  review_feedback?: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
}

export interface CounselorClass {
  class_id: string;
  class_name: string;
  college_name: string;
}

export interface CreateTaskFromTemplateInput {
  template_id: string;
  scope_type: TaskScopeType;
  target_class_ids: string[];
  published_at: string;
  deadline_at: string;
}

export async function listMyTasks(page = 1, limit = 20) {
  return get<StudentTask[]>(`/api/tasks/my?page=${page}&limit=${limit}`);
}

export async function getMyTaskDetail(id: string) {
  return get<TaskDetail>(`/api/tasks/my/${id}`);
}

export async function fetchTaskTemplates(page = 1, limit = 20) {
  return get<{ items: TaskTemplate[]; total: number; page: number; limit: number }>(
    `/api/task-templates?page=${page}&limit=${limit}`
  );
}

export async function createTaskFromTemplate(input: CreateTaskFromTemplateInput) {
  return post<Task[]>('/api/tasks/from-template', input);
}

export async function getCounselorClasses() {
  return get<CounselorClass[]>('/api/counselor/classes');
}
