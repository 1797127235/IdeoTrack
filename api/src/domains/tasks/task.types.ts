export type TaskScopeType = 'school' | 'college' | 'class' | 'pool';
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
  content: string;
  guiding_questions: string[] | null;  // AD-22: JSONB 数组，可选
  source_url: string | null;  // AD-22: 外部链接，可选
  video_url: string | null;  // AD-22: 视频 URL，可选
  scope_type: TaskScopeType;
  scope_id: string | null;  // school_id / college_id / class_id (pool 时为 NULL)
  target_college_id: string | null;  // 学院 ID（兼容旧 schema）
  target_class_id: string | null;  // 班级 ID（兼容旧 schema）
  source_task_id: string | null;  // AD-21: 派发实例指向源任务
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
}

export interface TaskWithStats extends TaskResponse {
  total_assignees: number;
  completed_count: number;
  completion_rate: number;
}

export interface CreateTaskInput {
  title: string;
  content: string;
  guiding_questions?: string[] | null;  // AD-22: 可选
  source_url?: string | null;  // AD-22: 可选
  video_url?: string | null;  // AD-22: 可选
  scope_type: TaskScopeType;
  scope_id?: string | null;  // school_id / college_id / class_id (pool 时为 NULL)
  target_college_id?: string | null;  // 学院 ID（兼容旧 schema）
  target_class_id?: string | null;  // 班级 ID（兼容旧 schema）
  published_at: string;
  deadline_at: string;
}

export interface DispatchTaskInput {
  source_task_id: string;  // AD-21: 必填
  target_class_id: string;
}

export interface UpdateTaskInput {
  title?: string;
  content?: string;
  guiding_questions?: string[] | null;
  source_url?: string | null;
  video_url?: string | null;
  scope_type?: TaskScopeType;
  scope_id?: string | null;
  target_college_id?: string | null;
  target_class_id?: string | null;
  published_at?: string;
  deadline_at?: string;
  status?: TaskStatus;
}

export interface TaskFilters {
  status?: TaskStatus;
  scopeType?: TaskScopeType;
}
