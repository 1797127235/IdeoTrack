import { logout, getUserRole } from '../../../utils/auth';
import { getMe, getMeStats, type MeResponse, type MeStatsResponse } from '../../../services/authApi';
import { updateTabBarSelected } from '../../../utils/tabBar';

Page({
  data: {
    role: '' as 'student' | 'counselor' | 'admin' | '',
    showReviewEntry: false,
    profile: null as MeResponse | null,
    profileLoading: true,
    stats: null as MeStatsResponse | null,
    statsLoading: true,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({
      role,
      showReviewEntry: role === 'counselor' || role === 'admin',
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
      console.error('获取用户信息失败:', err);
      this.setData({ profile: null, profileLoading: false });
    }
  },

  async loadStats() {
    this.setData({ statsLoading: true });
    try {
      const stats = await getMeStats();
      this.setData({ stats, statsLoading: false });
    } catch (err) {
      console.error('获取用户统计失败:', err);
      this.setData({ stats: null, statsLoading: false });
    }
  },

  goToReviews() {
    wx.navigateTo({ url: '/pages/review/index' });
  },

  goToExport() {
    wx.navigateTo({ url: '/pages/counselor/export/index' });
  },

  goToCalendar() {
    wx.switchTab({ url: '/pages/tab/2/index' });
  },

  goToLeaderboard() {
    wx.navigateTo({ url: '/pages/leaderboard/index' });
  },

  goToAchievements() {
    wx.showToast({ title: '成就详情开发中', icon: 'none' });
  },

  goToSettings() {
    wx.showToast({ title: '设置开发中', icon: 'none' });
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
