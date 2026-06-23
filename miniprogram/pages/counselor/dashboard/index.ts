import {
  getCounselorDashboard,
  type ClassDashboardItem,
  type DashboardSummary,
} from '../../../services/counselorApi';
import { updateTabBarSelected } from '../../../utils/tabBar';

function toBeijingDateString(d = new Date()): string {
  const s = d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const [datePart] = s.split(' ');
  const [year, month, day] = datePart.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDashboardDate(dateStr: string): string {
  const parts = dateStr.split(/[-/]/).map((s) => parseInt(s, 10));
  if (parts.length >= 3 && !Number.isNaN(parts[0])) {
    return `${parts[0]}年${parts[1]}月${parts[2]}日`;
  }
  return dateStr;
}

Page({
  data: {
    date: toBeijingDateString(),
    dateText: '',
    summary: null as DashboardSummary | null,
    classes: [] as ClassDashboardItem[],
    loading: true,
    errorMsg: '',
    refreshing: false,
  },

  onShow() {
    updateTabBarSelected();
    this.loadDashboard();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadDashboard().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  async loadDashboard() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getCounselorDashboard(this.data.date);
      this.setData({
        date: data.date,
        dateText: formatDashboardDate(data.date),
        summary: data.summary,
        classes: data.classes,
      });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        classes: [],
        summary: null,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToClassDetail(event: WechatMiniprogram.BaseEvent) {
    const { id, name } = event.currentTarget.dataset as { id?: string; name?: string };
    if (!id) return;
    const className = name || '班级详情';
    wx.navigateTo({
      url: `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(className)}&date=${encodeURIComponent(this.data.date)}`,
    });
  },
});
