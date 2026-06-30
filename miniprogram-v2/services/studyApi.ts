import { get } from './api';

export interface StudyRecordItem {
  id: string;
  taskId: string;
  taskTitle: string;
  status: string;
  checkedInAt: string;
  reflectionContent: string | null;
  points: number;
}

export interface StudyRecordsResult {
  items: StudyRecordItem[];
  total: number;
  page: number;
  limit: number;
}

export async function getStudyRecords(type?: 'task' | 'reflection'): Promise<StudyRecordsResult> {
  const path = type ? `/api/checkins/study-records?type=${type}` : '/api/checkins/study-records';
  const result = await get<StudyRecordsResult>(path);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取学习记录失败');
  }
  return result.data;
}
