import { dispatchTask, fetchTaskPool } from '../../../services/taskApi';

interface Task {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  published_at: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

Page({
  data: {
    taskPool: [] as Task[],
    selectedTask: null as Task | null,
    classes: [] as ClassInfo[],
    selectedClassId: '',
    deadlineDate: '',
    deadlineTime: '',
    loading: false,
    submitting: false,
    error: '',
  },

  onLoad() {
    this.loadTaskPool();
    this.loadClasses();
    this.setDefaultDeadline();
  },

  async loadTaskPool() {
    this.setData({ loading: true });
    try {
      const res = await fetchTaskPool();
      if (res.success && res.data) {
        this.setData({ taskPool: res.data.items });
      }
    } catch (err) {
      console.error('加载任务池失败:', err);
      this.setData({ error: '加载任务池失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadClasses() {
    try {
      // TODO: 从 API 获取辅导员所带班级
      // 临时使用模拟数据
      this.setData({
        classes: [
          { id: '1', name: '计算机2024-1班' },
          { id: '2', name: '计算机2024-2班' },
        ]
      });
    } catch (err) {
      console.error('加载班级失败:', err);
    }
  },

  setDefaultDeadline() {
    const now = new Date();
    now.setDate(now.getDate() + 7); // 默认7天后截止
    this.setData({
      deadlineDate: now.toISOString().slice(0, 10),
      deadlineTime: '23:59',
    });
  },

  selectTask(e: WechatMiniprogram.TouchEvent) {
    const taskId = e.currentTarget.dataset.id;
    const task = this.data.taskPool.find(t => t.id === taskId);
    this.setData({ selectedTask: task || null });
  },

  selectClass(e: WechatMiniprogram.PickerChange) {
    const classIndex = parseInt(e.detail.value as string, 10);
    this.setData({ selectedClassId: this.data.classes[classIndex].id });
  },

  onDeadlineDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ deadlineDate: e.detail.value as string });
  },

  onDeadlineTimeChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ deadlineTime: e.detail.value as string });
  },

  async submitDispatch() {
    const { selectedTask, selectedClassId, deadlineDate, deadlineTime } = this.data;

    if (!selectedTask) {
      wx.showToast({ title: '请选择任务', icon: 'none' });
      return;
    }

    if (!selectedClassId) {
      wx.showToast({ title: '请选择班级', icon: 'none' });
      return;
    }

    if (!deadlineDate || !deadlineTime) {
      wx.showToast({ title: '请设置截止时间', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const deadline_at = `${deadlineDate}T${deadlineTime}:00.000Z`;
      const res = await dispatchTask({
        source_task_id: selectedTask.id,
        target_class_id: selectedClassId,
        deadline_at,
      });

      if (res.success) {
        wx.showToast({ title: '派发成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.error?.message || '派发失败', icon: 'none' });
      }
    } catch (err) {
      console.error('派发任务失败:', err);
      wx.showToast({ title: '派发失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
