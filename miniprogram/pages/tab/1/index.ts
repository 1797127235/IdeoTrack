import {
  getCounselorDashboard,
  type ClassDashboardItem,
  type CounselorTaskDashboardItem,
} from '../../../services/counselorApi';
import { getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';

Page({
  data: {
    role: '' as string,
    currentTask: null as CounselorTaskDashboardItem | null,
    classes: [] as ClassDashboardItem[],
    loading: true,
    errorMsg: '',
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({ role });
    if (role === 'counselor') {
      this.loadClasses();
    }
  },

  onPullDownRefresh() {
    if (this.data.role === 'counselor') {
      this.loadClasses().finally(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  async loadClasses() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getCounselorDashboard();
      const currentTask = data.tasks[0] ?? null;
      this.setData({
        currentTask,
        classes: currentTask?.classes ?? [],
      });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        classes: [],
        currentTask: null,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToClassDetail(event: WechatMiniprogram.BaseEvent) {
    const { id, name } = event.currentTarget.dataset as { id?: string; name?: string };
    const taskId = this.data.currentTask?.task_id;
    if (!id || !taskId) {
      wx.showToast({ title: '班级或任务信息缺失', icon: 'none' });
      return;
    }
    const url = `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(name || '班级详情')}&taskId=${encodeURIComponent(taskId)}`;
    wx.navigateTo({ url });
  },
});
