import {
  getCounselorDashboard,
  ClassDashboardItem,
  DashboardSummary,
} from '../../../services/counselorApi';

import { updateTabBarSelected } from '../../../utils/tabBar';

function toBeijingDateString(d = new Date()): string {
  // 手动计算北京时间，避免 iOS/Android 对 toLocaleString 返回格式不一致
  const offsetMs = (d.getTimezoneOffset() + 480) * 60 * 1000;
  const beijing = new Date(d.getTime() + offsetMs);
  const year = beijing.getFullYear();
  const month = String(beijing.getMonth() + 1).padStart(2, '0');
  const day = String(beijing.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    if (!id) {
      wx.showToast({ title: '班级信息缺失', icon: 'none' });
      return;
    }
    const className = name || '班级详情';
    const url = `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(className)}&date=${encodeURIComponent(this.data.date)}`;
    wx.navigateTo({
      url,
      fail: (err) => {
        console.error('[navigateTo fail]', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      },
    });
  },
});
