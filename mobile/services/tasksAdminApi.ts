import { request } from './api';

export type TaskScopeType = 'school' | 'college' | 'class';
export type TaskStatus = 'published' | 'delisted';

export interface Task {
  id: string;
  title: string;
  content: string;
  scope_type: TaskScopeType;
  scope_label: string;
  target_college_id: string | null;
  target_class_id: string | null;
  created_by: string;
  published_at: string;
  deadline_at: string;
  status: TaskStatus;
  total_assignees: number;
  completed_count: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  content: string;
  scope_type: TaskScopeType;
  target_college_id?: string | null;
  target_class_id?: string | null;
  published_at: string;
  deadline_at: string;
}

export interface UpdateTaskInput {
  title?: string;
  content?: string;
  scope_type?: TaskScopeType;
  target_college_id?: string | null;
  target_class_id?: string | null;
  published_at?: string;
  deadline_at?: string;
  status?: TaskStatus;
}

export interface TaskListResult {
  items: Task[];
  total: number;
  page: number;
  limit: number;
}

export async function listTasks(
  filters: { status?: TaskStatus; scope_type?: TaskScopeType; page?: number; limit?: number } = {}
): Promise<TaskListResult> {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.scope_type) params.append('scope_type', filters.scope_type);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  const query = params.toString();
  const result = await request<TaskListResult>(`/api/tasks${query ? `?${query}` : ''}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取任务列表失败');
  }
  return result.data;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const result = await request<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '创建任务失败');
  }
  return result.data;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const result = await request<Task>(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '更新任务失败');
  }
  return result.data;
}

// P1: 走独立的下架端点（admin 可下架任意任务）
export async function delistTask(id: string): Promise<Task> {
  const result = await request<Task>(`/api/tasks/${id}/delist`, {
    method: 'PATCH',
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '下架任务失败');
  }
  return result.data;
}
