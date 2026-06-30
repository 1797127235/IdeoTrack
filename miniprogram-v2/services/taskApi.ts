import { get, post, getApiBaseUrl } from './api';
import { getToken } from '../utils/token';

export type TaskScopeType = 'school' | 'college' | 'class';
export type TaskTemplateStatus = 'draft' | 'published' | 'delisted';
export type TaskTemplateCategory = '学习' | '实践' | '活动' | '会议' | '阅读';
export type CheckinType = 'text' | 'image' | 'video' | 'mixed';

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
  attachment_url: string | null;
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
  template_id: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_meters: number | null;
  geo_address: string | null;
  require_face: boolean;
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
  attachment_url?: string | null;
}

export interface TaskDetail extends StudentTask {
  content: string;
  description?: string | null;
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

export interface TaskWithStats extends Task {
  total_assignees: number;
  completed_count: number;
  completion_rate: number;
  scope_label: string;
}

export interface TaskListResult {
  items: TaskWithStats[];
  total: number;
  page: number;
  limit: number;
}

export async function listMyTasks(page = 1, limit = 20) {
  return get<StudentTask[]>(`/api/tasks/my?page=${page}&limit=${limit}`);
}

export async function getMyTaskDetail(id: string) {
  return get<TaskDetail>(`/api/tasks/my/${id}`);
}

export async function listTasks(page = 1, limit = 50) {
  const result = await get<TaskListResult>(`/api/tasks?page=${page}&limit=${limit}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取任务列表失败');
  }
  return result.data;
}

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
  status: TaskTemplateStatus;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateListResult {
  items: TaskTemplate[];
  total: number;
  page: number;
  limit: number;
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
  attachment_url?: string | null;
  checkin_type?: CheckinType;
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
  min_text_length?: number | null;
  max_images?: number | null;
  require_location?: boolean;
  scope_type: TaskScopeType;
  scope_id?: string | null;
  published_at: string;
  deadline_at: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
  require_face?: boolean;
}

export interface CreateTaskFromTemplateInput {
  template_id: string;
  scope_type: TaskScopeType;
  scope_id?: string | null;
  target_class_ids?: string[];
  published_at: string;
  deadline_at: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
  geo_address?: string | null;
}

export async function fetchTaskTemplates(page = 1, limit = 50) {
  const result = await get<TaskTemplateListResult>(`/api/task-templates?page=${page}&limit=${limit}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取任务模板失败');
  }
  return result.data;
}

export async function createTask(input: CreateTaskInput) {
  const result = await post<Task>('/api/tasks', input);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '创建任务失败');
  }
  return result.data;
}

export async function createTaskFromTemplate(input: CreateTaskFromTemplateInput) {
  const result = await post<Task[]>('/api/tasks/from-template', input);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '从模板创建任务失败');
  }
  return result.data;
}

export async function uploadAttachment(filePath: string, fileName?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getApiBaseUrl()}/api/upload/attachment`,
      filePath,
      name: 'attachment',
      formData: fileName ? { name: fileName } : undefined,
      header: {
        Authorization: `Bearer ${getToken() || ''}`,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(res.data as string) as { success: boolean; data?: { path: string }; error?: { message: string } };
            if (data.success && data.data?.path) {
              resolve(data.data.path);
            } else {
              reject(new Error(data.error?.message || '上传附件失败'));
            }
          } catch {
            reject(new Error('上传附件响应解析失败'));
          }
        } else {
          reject(new Error(`上传附件失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传附件失败'));
      },
    });
  });
}
