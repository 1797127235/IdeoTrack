import { getMyTaskDetail, type Task } from '../../../services/taskApi';
import { formatDeadline } from '../../../utils/format';
import { theme } from '../../../theme';

function getStatusMeta(status: Task['status']) {
  switch (status) {
    case 'completed':
      return { label: '已完成', color: theme.colors.success };
    case 'reviewing':
      return { label: '复核中', color: theme.colors.warning };
    case 'overdue':
      return { label: '已逾期', color: theme.colors.error };
    default:
      return { label: '进行中', color: theme.colors.primary };
  }
}

function getButtonMeta(task: Task) {
  if (task.status === 'completed') return { text: '今日已打卡', disabled: true };
  if (task.status === 'overdue') return { text: '已逾期', disabled: true };
  return { text: '立即打卡 +10 积分', disabled: false };
}

Page({
  data: {
    taskId: '',
    task: null as Task | null,
    loading: true,
    error: '',
    statusLabel: '',
    statusColor: theme.colors.textSecondary as string,
    buttonText: '立即打卡',
    buttonDisabled: true,
    deadlineText: '',
  },

  onLoad(options: { id?: string }) {
    const taskId = options.id || '';
    if (!taskId) {
      this.setData({ loading: false, error: '任务 ID 缺失' });
      return;
    }
    this.setData({ taskId });
    this.loadTaskDetail(taskId);
  },

  async loadTaskDetail(taskId: string) {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getMyTaskDetail(taskId);
      if (res.success && res.data) {
        const task = res.data;
        const statusMeta = getStatusMeta(task.status);
        const buttonMeta = getButtonMeta(task);
        this.setData({
          task,
          loading: false,
          statusLabel: statusMeta.label,
          statusColor: statusMeta.color,
          buttonText: buttonMeta.text,
          buttonDisabled: buttonMeta.disabled,
          deadlineText: formatDeadline(task.deadline_at),
        });
      } else {
        this.setData({ error: res.error?.message || '获取任务详情失败', loading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取任务详情失败';
      this.setData({ error: message, loading: false });
    }
  },

  onPullDownRefresh() {
    const { taskId } = this.data;
    if (taskId) {
      this.loadTaskDetail(taskId).finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onRetry() {
    const { taskId } = this.data;
    if (taskId) {
      this.loadTaskDetail(taskId);
    }
  },

  onCheckIn() {
    const task = this.data.task as Task | null;
    const taskId = this.data.taskId as string;
    if (!task) return;

    if (task.status === 'completed') {
      wx.showToast({ title: '今日已打卡', icon: 'none' });
      return;
    }
    if (task.status === 'overdue') {
      wx.showToast({ title: '任务已截止，无法打卡', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/checkin/index?taskId=${taskId}`,
    });
  },
});
