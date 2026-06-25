import { getCounselorDashboard, type ClassDashboardItem } from '../../../services/counselorApi';
import { updateTabBarSelected } from '../../../utils/tabBar';

interface DashboardSummary {
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
}

interface ClassStat {
  class_id: string;
  class_name: string;
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
}

function buildSummaryFromUniqueClasses(classes: ClassDashboardItem[]): DashboardSummary {
  const total = classes.reduce((sum, c) => sum + c.total_students, 0);
  const checked = classes.reduce((sum, c) => sum + c.checked_in_count, 0);
  return {
    total_students: total,
    checked_in_count: checked,
    check_in_rate: total > 0 ? Math.round((checked / total) * 100) : 0,
  };
}

function uniqueClasses(tasks: { classes: ClassDashboardItem[] }[]): ClassDashboardItem[] {
  const map = new Map<string, ClassDashboardItem>();
  for (const task of tasks) {
    for (const c of task.classes) {
      if (!map.has(c.class_id)) {
        map.set(c.class_id, c);
      }
    }
  }
  return Array.from(map.values());
}

Page({
  data: {
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
      const data = await getCounselorDashboard();
      const classes = uniqueClasses(data.tasks);
      this.setData({
        summary: buildSummaryFromUniqueClasses(classes),
        classStats: classes.map((c) => ({
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
