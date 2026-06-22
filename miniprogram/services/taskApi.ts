import { get } from './api';

export interface Task {
  id: string;
  title: string;
  content: string;
  published_at: string;
  deadline_at: string;
  status: 'in_progress' | 'overdue' | 'completed' | 'reviewing';
  check_in_status?: string;
  completed_at?: string;
}

export async function getMyTaskDetail(id: string) {
  return get<Task>(`/api/tasks/my/${id}`);
}
