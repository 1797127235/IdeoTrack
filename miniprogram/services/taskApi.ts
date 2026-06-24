import { get, post } from './api';

export interface Task {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  scope_type: 'school' | 'college' | 'class' | 'pool';
  scope_id: string | null;
  source_task_id: string | null;
  published_at: string;
  deadline_at: string;
  status: 'published' | 'delisted';
  created_by: string;
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
  check_in_id?: string;
  check_in_status?: string;
  reflection_content?: string;
  ai_review_reason?: string;
  ai_review_reason_code?: string;
  reflection_modified?: boolean;
  review_feedback?: string;
}

export interface DispatchTaskInput {
  source_task_id: string;
  target_class_id: string;
  deadline_at: string;
}

export async function listMyTasks(page = 1, limit = 20) {
  return get<StudentTask[]>(`/api/tasks/my?page=${page}&limit=${limit}`);
}

export async function getMyTaskDetail(id: string) {
  return get<TaskDetail>(`/api/tasks/my/${id}`);
}

export async function fetchTaskPool(page = 1, limit = 20) {
  return get<{ items: Task[]; total: number; page: number; limit: number }>(`/api/tasks/pool?page=${page}&limit=${limit}`);
}

export async function dispatchTask(input: DispatchTaskInput) {
  return post<Task>('/api/tasks/dispatch', input);
}
