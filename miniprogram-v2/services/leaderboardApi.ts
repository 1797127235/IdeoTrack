import { get } from './api';

export interface LeaderboardItem {
  rank: number;
  userId: string;
  name: string;
  schoolId: string;
  points: number;
  isMe: boolean;
}

export interface LeaderboardResult {
  scope: 'class' | 'college' | 'school';
  myRank: number | null;
  beatRate: number;
  totalCount: number;
  items: LeaderboardItem[];
}

export async function getClassLeaderboard(): Promise<LeaderboardResult> {
  const result = await get<LeaderboardResult>('/api/leaderboard/class');
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取班级排行榜失败');
  }
  return result.data;
}

export async function getCollegeLeaderboard(): Promise<LeaderboardResult> {
  const result = await get<LeaderboardResult>('/api/leaderboard/college');
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取学院排行榜失败');
  }
  return result.data;
}

export async function getSchoolLeaderboard(): Promise<LeaderboardResult> {
  const result = await get<LeaderboardResult>('/api/leaderboard/school');
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || '获取全校排行榜失败');
  }
  return result.data;
}
