export type CheckInStatus =
  | 'submitted'
  | 'ai_reviewing'
  | 'ai_approved'
  | 'pending_manual_review'
  | 'approved'
  | 'rejected'
  | 'requires_modification';

export interface CheckIn {
  id: string;
  task_id: string;
  user_id: string;
  status: CheckInStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  checked_in_at: string;
  created_at: string;
  updated_at: string;
}

export interface CheckInResponse {
  id: string;
  task_id: string;
  status: CheckInStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  checked_in_at: string;
}

export interface CreateCheckInInput {
  task_id: string;
  latitude: number;
  longitude: number;
  address?: string;
}
