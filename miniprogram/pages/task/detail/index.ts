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
  const checkInStatus = task.check_in_status || '';
  if (checkInStatus === 'rejected') return { text: '未通过复核', disabled: true };
  if (checkInStatus === 'requires_modification') return { text: '需修改心得', disabled: true };
  if (checkInStatus === 'pending_manual_review') return { text: '等待辅导员复核', disabled: true };
  return { text: '立即打卡 +10 积分', disabled: false };
}

function getReviewStatusMeta(status: string) {
  switch (status) {
    case 'approved':
      return { label: '已通过', color: theme.colors.success, icon: '✓' };
    case 'rejected':
      return { label: '未通过', color: theme.colors.error, icon: '✕' };
    case 'requires_modification':
      return { label: '要求修改', color: theme.colors.warning, icon: '!' };
    case 'pending_manual_review':
      return { label: '待复核', color: theme.colors.warning, icon: '…' };
    default:
      return null;
  }
}

function getReviewReasonText(reasonCode: string | undefined, reason: string | undefined): string {
  switch (reasonCode) {
    case 'length_insufficient':
      return '字数不足';
    case 'sensitive_content':
      return '包含敏感内容';
    case 'template_phrase':
      return '内容疑似套话';
    case 'too_similar':
      return '与任务内容重复度过高';
    case 'llm_review_required':
    case 'llm_error':
    case 'ai_review_error':
      return 'AI 建议人工复核';
    default:
      return reason || '需人工复核';
  }
}

function canModifyReflection(task: Task): boolean {
  const status = task.check_in_status || '';
  if (status === 'requires_modification') return true;
  if (status === 'pending_manual_review' && task.reflection_modified !== true) return true;
  return false;
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
    showModifyReflection: false,
    deadlineText: '',
    reviewMeta: null as { label: string; color: string; icon: string } | null,
    reviewReasonText: '',
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
          showModifyReflection: canModifyReflection(task),
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

  onModifyReflection() {
    const task = this.data.task as Task | null;
    const taskId = this.data.taskId as string;
    const checkInId = task?.check_in_id;
    const status = task?.check_in_status;
    if (!checkInId || !status) return;
    wx.navigateTo({
      url: `/pages/reflection/index?checkInId=${checkInId}&taskId=${taskId}&mode=edit&status=${status}`,
    });
  },
});
