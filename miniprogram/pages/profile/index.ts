import { logout, getUserRole } from '../../utils/auth';

Page({
  data: {
    role: '' as 'student' | 'counselor' | 'admin' | '',
    showReviewEntry: false,
  },

  onShow() {
    const role = getUserRole();
    this.setData({
      role: role || '',
      showReviewEntry: role === 'counselor' || role === 'admin',
    });
  },

  goToReviews() {
    wx.navigateTo({ url: '/pages/review/index' });
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
