import { logout, getUserRole } from '../../../utils/auth';
import { getMe, getMeStats, type MeResponse, type MeStatsResponse } from '../../../services/authApi';
import { updateTabBarSelected } from '../../../utils/tabBar';

const defaultStats: MeStatsResponse = {
  points: 0,
  level: { level: 1, title: '学习新兵', minPoints: 0, maxPoints: 99 },
  badges: [],
  earnedBadgeCount: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalApproved: 0,
  recent7Days: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), checkedIn: false };
  }),
  monthly: {
    completedTasks: 0,
    totalTasks: 0,
    completionRate: 0,
    currentStreak: 0,
    maxStreak: 0,
    reflections: 0,
    points: 0,
  },
  weekly: [],
};

Page({
  data: {
    role: '' as 'student' | 'counselor' | 'admin' | '',
    showReviewEntry: false,
    profile: null as MeResponse | null,
    profileLoading: true,
    stats: defaultStats as MeStatsResponse,
    statsLoading: true,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({
      role,
      showReviewEntry: role === 'counselor' || role === 'admin',
      stats: defaultStats,
    });
    this.loadProfile();
    if (role === 'student') {
      this.loadStats();
    }
  },

  async loadProfile() {
    this.setData({ profileLoading: true });
    try {
      const profile = await getMe();
      this.setData({ profile, profileLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取用户信息失败';
      console.error('获取用户信息失败:', err);
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ profile: null, profileLoading: false });
    }
  },

  async loadStats() {
    this.setData({ statsLoading: true });
    try {
      const stats = await getMeStats();
      this.setData({ stats, statsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取统计数据失败';
      console.error('获取用户统计失败:', err);
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ stats: defaultStats, statsLoading: false });
    }
  },

  goToReviews() {
    wx.navigateTo({ url: '/pages/review/index' });
  },

  goToExport() {
    wx.navigateTo({ url: '/pages/counselor/export/index' });
  },

  goToSettings() {
    wx.showToast({ title: '设置开发中', icon: 'none' });
  },

  goToHelp() {
    wx.showToast({ title: '帮助与反馈开发中', icon: 'none' });
  },

  goToAbout() {
    wx.showToast({ title: '关于我们开发中', icon: 'none' });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
        }
      },
    });
  },
});
