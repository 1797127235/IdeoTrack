import { logout, getUserRole } from '../../utils/auth';
import { getMe } from '../../services/authApi';
import { MeResponse } from '../../services/authApi';
import { updateTabBarSelected } from '../../utils/tabBar';

Page({
  data: {
    role: '' as 'student' | 'counselor' | 'admin' | '',
    showReviewEntry: false,
    profile: null as MeResponse | null,
    profileLoading: true,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({
      role,
      showReviewEntry: role === 'counselor' || role === 'admin',
    });
    this.loadProfile();
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

  goToReviews() {
    wx.navigateTo({ url: '/pages/review/index' });
  },

  goToExport() {
    wx.navigateTo({ url: '/pages/counselor/export/index' });
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
