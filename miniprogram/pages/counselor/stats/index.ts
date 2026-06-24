import { getCounselorDashboard, type DashboardSummary } from '../../../services/counselorApi';
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
    date: toBeijingDateString(),
    summary: null as DashboardSummary | null,
    classStats: [] as ClassStat[],
    loading: true,
  },

  onShow() {
    updateTabBarSelected();
    this.loadStats();
  },

  async loadStats() {
    this.setData({ loading: true });
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
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' });
    }
  },

  goToExport() {
    wx.navigateTo({ url: '/pages/counselor/export/index' });
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  },
});
