import { fetchTaskTemplates, type Task, type TaskTemplate } from '../../../services/taskApi';
import { get } from '../../../services/api';
import { updateTabBarSelected } from '../../../utils/tabBar';

Page({
  data: {
    templates: [] as TaskTemplate[],
    dispatchedTasks: [] as Task[],
    loading: true,
  },

  onShow() {
    updateTabBarSelected();
    this.loadTasks();
  },

  async loadTasks() {
    this.setData({ loading: true });
    try {
      const [templateRes, listRes] = await Promise.all([
        fetchTaskTemplates(),
        get<{ items: Task[] }>('/api/tasks'),
      ]);
      this.setData({
        templates: templateRes.data?.items ?? [],
        dispatchedTasks: listRes.data?.items ?? [],
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' });
    }
  },

  dispatchTask(event: WechatMiniprogram.BaseEvent) {
    const templateId = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/counselor/task-dispatch/index?taskId=${templateId}` });
  },

  onPullDownRefresh() {
    this.loadTasks().finally(() => wx.stopPullDownRefresh());
  },
});
