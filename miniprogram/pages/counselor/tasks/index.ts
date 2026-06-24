import { fetchTaskPool, type Task } from '../../../services/taskApi';
import { get, type ApiResponse } from '../../../services/api';
import { updateTabBarSelected } from '../../../utils/tabBar';

interface DispatchedTask extends Task {
  source_task_id: string;
}

Page({
  data: {
    poolTasks: [] as Task[],
    dispatchedTasks: [] as DispatchedTask[],
    loading: true,
  },

  onShow() {
    updateTabBarSelected();
    this.loadTasks();
  },

  async loadTasks() {
    this.setData({ loading: true });
    try {
      const [poolRes, listRes] = await Promise.all([
        fetchTaskPool(),
        get<{ items: Task[] }>('/api/tasks'),
      ]);
      this.setData({
        poolTasks: poolRes.data?.items ?? [],
        dispatchedTasks: (listRes.data?.items ?? []).filter(
          (t): t is DispatchedTask => !!t.source_task_id
        ),
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' });
    }
  },

  dispatchTask(event: WechatMiniprogram.BaseEvent) {
    const taskId = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/counselor/task-dispatch/index?taskId=${taskId}` });
  },

  onPullDownRefresh() {
    this.loadTasks().finally(() => wx.stopPullDownRefresh());
  },
});
