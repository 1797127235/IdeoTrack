import {
  dispatchTask,
  fetchTaskPool,
  getCounselorClasses,
  type Task,
  type CounselorClass,
} from '../../../services/taskApi';
import { formatDeadline } from '../../../utils/format';

interface ClassSelectItem extends CounselorClass {
  selected: boolean;
}

interface TaskView extends Task {
  deadlineText: string;
}

Page({
  data: {
    taskPool: [] as TaskView[],
    selectedTask: null as TaskView | null,
    classes: [] as ClassSelectItem[],
    allSelected: false,
    selectedCount: 0,
    loading: false,
    submitting: false,
    error: '',
  },

  onLoad() {
    this.loadTaskPool();
    this.loadClasses();
  },

  async loadTaskPool() {
    this.setData({ loading: true });
    try {
      const res = await fetchTaskPool();
      if (res.success && res.data) {
        const taskPool = res.data.items.map<TaskView>((t) => ({
          ...t,
          deadlineText: formatDeadline(t.deadline_at),
        }));
        this.setData({ taskPool });
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
      const res = await getCounselorClasses();
      if (res.success && res.data) {
        const classes: ClassSelectItem[] = res.data.map((c) => ({ ...c, selected: false }));
        this.setData({ classes });
      } else {
        this.setData({ error: res.error?.message || '加载班级失败' });
      }
    } catch (err) {
      console.error('加载班级失败:', err);
      this.setData({ error: '加载班级失败' });
    }
  },

  selectTask(e: WechatMiniprogram.TouchEvent) {
    const taskId = e.currentTarget.dataset.id as string;
    const task = this.data.taskPool.find((t) => t.id === taskId) || null;
    this.setData({ selectedTask: task });
  },

  toggleClass(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.idx as number;
    const key = `classes[${idx}].selected`;
    const current = this.data.classes[idx].selected;
    this.setData({ [key]: !current } as Record<string, boolean>);
    const selectedCount = this.data.classes.filter((c) => c.selected).length;
    this.setData({
      allSelected: selectedCount === this.data.classes.length,
      selectedCount,
    });
  },

  toggleSelectAll() {
    const allSelected = !this.data.allSelected;
    const classes = this.data.classes.map((c) => ({ ...c, selected: allSelected }));
    this.setData({
      classes,
      allSelected,
      selectedCount: allSelected ? classes.length : 0,
    });
  },

  async submitDispatch() {
    const { selectedTask, classes } = this.data;
    const selectedClassIds = classes.filter((c) => c.selected).map((c) => c.class_id);

    if (!selectedTask) {
      wx.showToast({ title: '请选择任务', icon: 'none' });
      return;
    }

    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请选择班级', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      for (const classId of selectedClassIds) {
        const res = await dispatchTask({
          source_task_id: selectedTask.id,
          target_class_id: classId,
        });
        if (!res.success) {
          throw new Error(res.error?.message || '派发失败');
        }
      }
      wx.showToast({ title: '派发成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('派发任务失败:', err);
      wx.showToast({ title: err instanceof Error ? err.message : '派发失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
