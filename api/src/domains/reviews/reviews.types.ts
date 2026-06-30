export interface AIReviewResult {
  status: 'ai_approved' | 'pending_manual_review';
  reason?: string;
  reason_code?: string;
}

export interface AIReviewInput {
  reflectionContent: string;
  taskContent: string;
}

export interface AIReviewRecordInput {
  checkInId: string;
  taskId: string;
  userId: string;
  reflectionContent: string;
  taskContent: string;
  status: 'ai_approved' | 'pending_manual_review';
  reason?: string;
  reasonCode?: string;
}

export interface PendingReviewItem {
  check_in_id: string;
  student_id: string;
  student_school_id: string;
  student_name: string | null;
  class_id: string;
  class_name: string;
  task_id: string;
  task_title: string;
  reflection_content: string | null;
  ai_review_reason: string | null;
  ai_review_reason_code: string | undefined;
  submitted_at: string;
}

export interface PendingReviewList {
  items: PendingReviewItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PendingReviewFilters {
  classId?: string;
  taskId?: string;
  page?: number;
  limit?: number;
}

export interface ReviewDecisionInput {
  checkInId: string;
  counselorId: string;
  decision: 'approve' | 'reject' | 'require_modification';
  feedback?: string;
}
