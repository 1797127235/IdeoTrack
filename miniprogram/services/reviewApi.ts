import { get, post } from './api';

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
  ai_review_reason_code?: string;
  submitted_at: string;
}

export interface PendingReviewList {
  items: PendingReviewItem[];
  total: number;
  page: number;
  limit: number;
}

export type ReviewDecision = 'approve' | 'reject' | 'require_modification';

export async function getPendingReviews(page = 1, limit = 20): Promise<PendingReviewList> {
  const result = await get<PendingReviewList>(
    `/api/reviews/pending?page=${page}&limit=${limit}`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取待复核列表失败');
  }
  return result.data;
}

export async function getPendingReviewDetail(checkInId: string): Promise<PendingReviewItem> {
  const result = await get<PendingReviewItem>(`/api/reviews/pending/${checkInId}`);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取复核详情失败');
  }
  return result.data;
}

export async function submitReviewDecision(
  checkInId: string,
  decision: ReviewDecision,
  feedback?: string
): Promise<void> {
  const result = await post<{ status: string }>(`/api/reviews/${checkInId}/decision`, {
    decision,
    feedback,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '提交复核决策失败');
  }
}
