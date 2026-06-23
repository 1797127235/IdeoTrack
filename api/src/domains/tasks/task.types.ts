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
  content: string;
  scope_type: TaskScopeType;
  target_college_id: string | null;
  target_class_id: string | null;
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

export interface TaskFilters {
  status?: TaskStatus;
  scopeType?: TaskScopeType;
}
