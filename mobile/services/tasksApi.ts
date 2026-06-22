import { request } from './api';

export type StudentTaskStatus = 'in_progress' | 'overdue' | 'completed' | 'reviewing';

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
  check_in_status?: string;
}

export async function getMyTasks(page = 1, limit = 20): Promise<StudentTask[]> {
  const result = await request<StudentTask[]>(`/api/tasks/my?page=${page}&limit=${limit}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取任务列表失败');
  }
  return result.data;
}

export async function getMyTaskDetail(id: string): Promise<TaskDetail> {
  const result = await request<TaskDetail>(`/api/tasks/my/${id}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取任务详情失败');
  }
  return result.data;
}
