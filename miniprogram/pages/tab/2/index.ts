import { getMeStats, type MeStatsResponse } from '../../../services/authApi';
import { getClassLeaderboard, type LeaderboardResult } from '../../../services/leaderboardApi';
import { getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';

const defaultStats: MeStatsResponse = {
  points: 0,
  level: { level: 1, title: '新手学员', minPoints: 0, maxPoints: 99 },
  badges: [],
  earnedBadgeCount: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalApproved: 0,
  recent7Days: [],
  monthly: {
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0,
    currentStreak: 0,
    maxStreak: 0,
    reflections: 0,
    points: 0,
  },
  weekly: Array.from({ length: 7 }, () => ({ day: '', label: '', completed: 0 })),
};

const defaultLeaderboard: LeaderboardResult = {
  scope: 'class',
  myRank: null,
  beatRate: 0,
  totalCount: 0,
  items: [],
};

Page({
  data: {
    role: '' as string,
    stats: defaultStats as MeStatsResponse,
    leaderboard: defaultLeaderboard as LeaderboardResult,
    loading: true,
    levelProgress: 0,
    maxWeekly: 1,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({
      role,
      stats: defaultStats,
      leaderboard: defaultLeaderboard,
      loading: true,
      levelProgress: 0,
      maxWeekly: 1,
    });
    this.loadGrowth();
  },

  onPullDownRefresh() {
    this.loadGrowth().finally(() => wx.stopPullDownRefresh());
  },

  async loadGrowth() {
    this.setData({ loading: true });
    try {
      const [stats, leaderboard] = await Promise.all([
        getMeStats(),
        getClassLeaderboard().catch((err) => {
          console.error('获取排行榜失败:', err);
          return defaultLeaderboard;
        }),
      ]);
      const maxWeekly = Math.max(1, ...stats.weekly.map((w) => w.completed));
      const levelProgress = this.computeLevelProgress(stats);
      this.setData({ stats, leaderboard, maxWeekly, levelProgress, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取成长数据失败';
      console.error('获取成长数据失败:', err);
      wx.showToast({ title: message, icon: 'none' });
      this.setData({
        stats: defaultStats,
        leaderboard: defaultLeaderboard,
        maxWeekly: 1,
        levelProgress: 0,
        loading: false,
      });
    }
  },

  computeLevelProgress(stats: MeStatsResponse): number {
    const { level, points } = stats;
    if (!level.maxPoints) return 100;
    const range = level.maxPoints - level.minPoints + 1;
    const gained = points - level.minPoints;
    return Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
  },

  switchLeaderboardScope(e: WechatMiniprogram.TouchEvent) {
    const scope = e.currentTarget.dataset.scope as 'class' | 'college' | 'school';
    this.loadLeaderboard(scope);
  },

  async loadLeaderboard(scope: 'class' | 'college' | 'school') {
    try {
      const { getClassLeaderboard, getCollegeLeaderboard, getSchoolLeaderboard } = await import('../../../services/leaderboardApi');
      const fetcher =
        scope === 'class'
          ? getClassLeaderboard
          : scope === 'college'
          ? getCollegeLeaderboard
          : getSchoolLeaderboard;
      const leaderboard = await fetcher();
      this.setData({ leaderboard });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取排行榜失败';
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  goToCalendar() {
    wx.navigateTo({ url: '/pages/calendar/index' });
  },

  goToLeaderboard() {
    wx.navigateTo({ url: '/pages/leaderboard/index' });
  },

  goToAchievements() {
    wx.showToast({ title: '成就详情开发中', icon: 'none' });
  },
});
