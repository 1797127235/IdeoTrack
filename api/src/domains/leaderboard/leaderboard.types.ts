export interface LeaderboardScope {
  scope: 'class' | 'college' | 'school';
}

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
