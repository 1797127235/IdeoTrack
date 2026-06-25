import { getMeStats, type MeStatsResponse } from '../../../services/authApi';
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

function formatNickname(name: string | null, schoolId: string): string {
  return name || schoolId || '同学';
}

Page({
  data: {
    role: '' as string,
    profileName: '同学',
    stats: defaultStats as MeStatsResponse,
    loading: true,
    levelProgress: 0,
    maxWeekly: 1,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({ role, stats: defaultStats, loading: true, levelProgress: 0, maxWeekly: 1 });
    this.loadGrowth();
  },

  onPullDownRefresh() {
    this.loadGrowth().finally(() => wx.stopPullDownRefresh());
  },

  async loadGrowth() {
    this.setData({ loading: true });
    try {
      const stats = await getMeStats();
      const maxWeekly = Math.max(1, ...stats.weekly.map((w) => w.completed));
      const levelProgress = this.computeLevelProgress(stats);
      this.setData({ stats, maxWeekly, levelProgress, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取成长数据失败';
      console.error('获取成长数据失败:', err);
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ stats: defaultStats, maxWeekly: 1, levelProgress: 0, loading: false });
    }
  },

  computeLevelProgress(stats: MeStatsResponse): number {
    const { level, points } = stats;
    if (!level.maxPoints) return 100;
    const range = level.maxPoints - level.minPoints + 1;
    const gained = points - level.minPoints;
    return Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
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
