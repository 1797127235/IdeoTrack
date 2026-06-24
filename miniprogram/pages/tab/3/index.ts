import { getCounselorDashboard, type DashboardSummary } from '../../../services/counselorApi';
import { logout, getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';
import { toBeijingDateString } from '../../../utils/date';

interface ClassStat {
  class_id: string;
  class_name: string;
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
}

Page({
  data: {
    role: '' as 'student' | 'counselor' | 'admin' | '',
    showReviewEntry: false,
    // Counselor stats
    date: toBeijingDateString(),
    summary: null as DashboardSummary | null,
    classStats: [] as ClassStat[],
    statsLoading: true,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({
      role,
      showReviewEntry: role === 'counselor' || role === 'admin',
    });
    if (role === 'counselor') {
      this.loadStats();
    }
  },

  onPullDownRefresh() {
    if (this.data.role === 'counselor') {
      this.loadStats().finally(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  async loadStats() {
    this.setData({ statsLoading: true });
    try {
      const data = await getCounselorDashboard(this.data.date);
      this.setData({
        summary: data.summary,
        classStats: data.classes.map((c) => ({
          class_id: c.class_id,
          class_name: c.class_name,
          total_students: c.total_students,
          checked_in_count: c.checked_in_count,
          check_in_rate: c.check_in_rate,
        })),
        statsLoading: false,
      });
    } catch (err) {
      this.setData({ statsLoading: false });
      wx.showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' });
    }
  },

  goToExport() {
    wx.navigateTo({ url: '/pages/counselor/export/index' });
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
