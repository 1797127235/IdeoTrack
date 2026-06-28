import { getMeStats } from '../../../services/authApi';
import { MeStatsResponse } from '../../../services/authApi';
import {
  getClassLeaderboard,
  getCollegeLeaderboard,
  getSchoolLeaderboard,
  type LeaderboardResult,
} from '../../../services/leaderboardApi';
import { fetchTaskTemplates, type Task, type TaskTemplate } from '../../../services/taskApi';
import { get } from '../../../services/api';
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
    // 学生成长
    stats: defaultStats as MeStatsResponse,
    leaderboard: defaultLeaderboard as LeaderboardResult,
    loading: true,
    monthlyCompletionRate: 0,
    levelProgress: 0,
    maxWeekly: 1,
    // 辅导员任务
    templates: [] as TaskTemplate[],
    dispatchedTasks: [] as Task[],
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({
      role,
      stats: defaultStats,
      leaderboard: defaultLeaderboard,
      loading: true,
      monthlyCompletionRate: 0,
      levelProgress: 0,
      maxWeekly: 1,
      templates: [],
      dispatchedTasks: [],
    });

    if (role === 'counselor') {
      wx.setNavigationBarTitle({ title: '任务管理' });
      this.loadCounselorTasks();
    } else {
      wx.setNavigationBarTitle({ title: '成长' });
      this.loadGrowth();
    }
  },

  onPullDownRefresh() {
    const { role } = this.data;
    const promise = role === 'counselor' ? this.loadCounselorTasks() : this.loadGrowth();
    promise.finally(() => wx.stopPullDownRefresh());
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
      const monthlyCompletionRate = Math.min(100, Math.max(0, stats.monthly.completionRate));
      const levelProgress = this.computeLevelProgress(stats);
      this.setData({ stats, leaderboard, maxWeekly, monthlyCompletionRate, levelProgress, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取成长数据失败';
      console.error('获取成长数据失败:', err);
      wx.showToast({ title: message, icon: 'none' });
      this.setData({
        stats: defaultStats,
        leaderboard: defaultLeaderboard,
        maxWeekly: 1,
        monthlyCompletionRate: 0,
        levelProgress: 0,
        loading: false,
      });
    }
  },

  async loadCounselorTasks() {
    this.setData({ loading: true });
    try {
      const [templateRes, listRes] = await Promise.all([
        fetchTaskTemplates(),
        get<{ items: Task[] }>('/api/tasks'),
      ]);
      this.setData({
        templates: templateRes.data?.items ?? [],
        dispatchedTasks: listRes.data?.items ?? [],
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' });
    }
  },

  dispatchTask(event: WechatMiniprogram.BaseEvent) {
    const taskId = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/counselor/task-dispatch/index?taskId=${taskId}` });
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
