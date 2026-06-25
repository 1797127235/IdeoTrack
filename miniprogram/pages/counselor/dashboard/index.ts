import {
  getCounselorDashboard,
  type CounselorTaskDashboardItem,
} from '../../../services/counselorApi';
import { updateTabBarSelected } from '../../../utils/tabBar';

Page({
  data: {
    tasks: [] as CounselorTaskDashboardItem[],
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
      const data = await getCounselorDashboard();
      this.setData({ tasks: data.tasks });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        tasks: [],
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToTaskClasses(event: WechatMiniprogram.BaseEvent) {
    const { id, title } = event.currentTarget.dataset as { id?: string; title?: string };
    if (!id) {
      wx.showToast({ title: '任务信息缺失', icon: 'none' });
      return;
    }
    const url = `/pages/counselor/classes/index?taskId=${encodeURIComponent(id)}&taskName=${encodeURIComponent(title || '任务详情')}`;
    wx.navigateTo({
      url,
      fail: (err) => {
        console.error('[navigateTo fail]', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      },
    });
  },

  goToExport() {
    wx.navigateTo({
      url: '/pages/counselor/export/index',
      fail: (err) => {
        console.error('[navigateTo export fail]', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      },
    });
  },
});
