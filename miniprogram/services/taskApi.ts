import { get } from './api';

export interface Task {
  id: string;
  title: string;
  content: string;
  published_at: string;
  deadline_at: string;
  status: 'in_progress' | 'overdue' | 'completed' | 'reviewing';
  check_in_id?: string;
  check_in_status?: string;
  reflection_content?: string;
  ai_review_reason?: string;
  ai_review_reason_code?: string;
  reflection_modified?: boolean;
  review_feedback?: string;
  completed_at?: string;
}

export interface StudentTask {
  id: string;
  title: string;
  content: string;
  published_at: string;
  deadline_at: string;
  status: Task['status'];
  completed_at?: string;
}

export async function listMyTasks(page = 1, limit = 20) {
  return get<StudentTask[]>(`/api/tasks/my?page=${page}&limit=${limit}`);
}

export async function getMyTaskDetail(id: string) {
  return get<Task>(`/api/tasks/my/${id}`);
}
