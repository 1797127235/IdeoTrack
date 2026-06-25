import { getCounselorDashboard, type CounselorTaskDashboardItem } from '../../../services/counselorApi';
import { logout, getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';

interface DashboardSummary {
  total_tasks: number;
  total_possible: number;
  total_checked: number;
  check_in_rate: number;
}

interface ClassStat {
  class_id: string;
  class_name: string;
  total_possible: number;
  total_checked: number;
  check_in_rate: number;
}

function aggregateStats(tasks: CounselorTaskDashboardItem[]): {
  summary: DashboardSummary;
  classStats: ClassStat[];
} {
  const classMap = new Map<string, ClassStat>();

  for (const task of tasks) {
    for (const c of task.classes) {
      const entry = classMap.get(c.class_id);
      if (entry) {
        entry.total_possible += c.total_students;
        entry.total_checked += c.checked_in_count;
      } else {
        classMap.set(c.class_id, {
          class_id: c.class_id,
          class_name: c.class_name,
          total_possible: c.total_students,
          total_checked: c.checked_in_count,
          check_in_rate: 0,
        });
      }
    }
  }

  const classStats = Array.from(classMap.values()).map((c) => ({
    ...c,
    check_in_rate: c.total_possible > 0 ? Math.round((c.total_checked / c.total_possible) * 100) : 0,
  }));

  const totalPossible = classStats.reduce((sum, c) => sum + c.total_possible, 0);
  const totalChecked = classStats.reduce((sum, c) => sum + c.total_checked, 0);

  return {
    summary: {
      total_tasks: tasks.length,
      total_possible: totalPossible,
      total_checked: totalChecked,
      check_in_rate: totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0,
    },
    classStats,
  };
}

Page({
  data: {
    role: '' as 'student' | 'counselor' | 'admin' | '',
    showReviewEntry: false,
    // Counselor stats
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
      const data = await getCounselorDashboard();
      const { summary, classStats } = aggregateStats(data.tasks);
      this.setData({
        summary,
        classStats,
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
