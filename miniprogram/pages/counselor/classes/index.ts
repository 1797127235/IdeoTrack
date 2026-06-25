import {
  getTaskClassStats,
  type ClassDashboardItem,
} from '../../../services/counselorApi';
import { updateTabBarSelected } from '../../../utils/tabBar';

Page({
  data: {
    taskId: '',
    taskName: '任务班级统计',
    classes: [] as ClassDashboardItem[],
    loading: true,
    errorMsg: '',
  },

  onLoad(options: { taskId?: string; taskName?: string }) {
    const taskId = options.taskId || '';
    const taskName = options.taskName ? decodeURIComponent(options.taskName) : '任务班级统计';
    this.setData({ taskId, taskName });
    if (taskId) {
      this.loadClasses();
    } else {
      this.setData({ errorMsg: '任务 ID 无效', loading: false });
    }
  },

  onShow() {
    updateTabBarSelected();
    if (this.data.taskId) {
      this.loadClasses();
    }
  },

  onPullDownRefresh() {
    this.loadClasses().finally(() => wx.stopPullDownRefresh());
  },

  async loadClasses() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getTaskClassStats(this.data.taskId);
      this.setData({ classes: data.classes });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        classes: [],
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
    const url = `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(name || '班级详情')}&taskId=${encodeURIComponent(this.data.taskId)}`;
    wx.navigateTo({ url });
  },
});
