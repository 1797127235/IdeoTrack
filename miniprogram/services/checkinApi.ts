import { post } from './api';

export interface CreateCheckInData {
  task_id: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface CheckInResponse {
  id: string;
  task_id: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  checked_in_at: string;
}

export async function createCheckIn(data: CreateCheckInData) {
  return post<CheckInResponse>('/api/checkins', data);
}
