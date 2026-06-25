import { fetchTaskPool, type Task } from '../../../services/taskApi';
import { get, type ApiResponse } from '../../../services/api';
import { updateTabBarSelected } from '../../../utils/tabBar';

Page({
  data: {
    poolTasks: [] as Task[],
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
      const [poolRes, listRes] = await Promise.all([
        fetchTaskPool(),
        get<{ items: Task[] }>('/api/tasks'),
      ]);
      this.setData({
        poolTasks: poolRes.data?.items ?? [],
        // 服务端已按辅导员可见范围返回（全校/学院/班级 + 自己派发）
        dispatchedTasks: (listRes.data?.items ?? []).filter(
          (t) => t.scope_type !== 'pool'
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
