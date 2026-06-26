import { getMyTaskDetail, type TaskDetail } from '../../../services/taskApi';
import { formatDeadline } from '../../../utils/format';
import { theme } from '../../../theme';

type StepStatus = 'pending' | 'current' | 'completed';

interface TaskStep {
  index: number;
  title: string;
  desc: string;
  status: StepStatus;
}

function getStatusMeta(status: TaskDetail['status']) {
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

function getButtonMeta(task: TaskDetail) {
  if (task.status === 'completed') return { text: '今日已打卡', disabled: true };
  if (task.status === 'overdue') return { text: '已逾期', disabled: true };
  const checkInStatus = task.check_in_status || '';
  if (checkInStatus === 'submitted') return { text: '去写心得', disabled: false };
  if (checkInStatus === 'rejected') return { text: '未通过复核', disabled: true };
  if (checkInStatus === 'requires_modification') return { text: '需修改心得', disabled: false };
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

function canModifyReflection(task: TaskDetail): boolean {
  const status = task.check_in_status || '';
  if (status === 'requires_modification') return true;
  if (status === 'pending_manual_review' && task.reflection_modified !== true) return true;
  return false;
}

function buildSteps(task: TaskDetail): TaskStep[] {
  const requireLocation = task.geo_lat != null && task.geo_lng != null && task.geo_radius_meters != null;
  const steps: TaskStep[] = [
    { index: 1, title: '阅读任务', desc: '了解学习内容', status: 'current' },
    { index: 2, title: requireLocation ? '定位签到' : '确认签到', desc: requireLocation ? '在指定位置打卡' : '点击确认完成打卡', status: 'pending' },
    { index: 3, title: '撰写心得', desc: '提交学习体会', status: 'pending' },
  ];

  if (task.status === 'completed') {
    steps[0].status = 'completed';
    steps[1].status = 'completed';
    steps[2].status = 'completed';
  } else if (task.check_in_id) {
    steps[0].status = 'completed';
    steps[1].status = 'completed';
    steps[2].status = 'current';
  }

  return steps;
}

Page({
  data: {
    taskId: '',
    task: null as TaskDetail | null,
    loading: true,
    error: '',
    statusLabel: '',
    statusColor: theme.colors.textSecondary as string,
    buttonText: '立即打卡',
    buttonDisabled: true,
    showModifyReflection: false,
    deadlineText: '',
    steps: [] as TaskStep[],
    reviewMeta: null as { label: string; color: string; icon: string } | null,
    reviewReasonText: '',
    requireLocation: false,
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
        const steps = buildSteps(task);
        const reviewMeta = getReviewStatusMeta(task.check_in_status || '');
        const reviewReasonText = getReviewReasonText(task.ai_review_reason_code, task.ai_review_reason);
        const requireLocation = task.geo_lat != null && task.geo_lng != null && task.geo_radius_meters != null;
        this.setData({
          task,
          loading: false,
          statusLabel: statusMeta.label,
          statusColor: statusMeta.color,
          buttonText: buttonMeta.text,
          buttonDisabled: buttonMeta.disabled,
          showModifyReflection: canModifyReflection(task),
          deadlineText: formatDeadline(task.deadline_at),
          steps,
          reviewMeta,
          reviewReasonText,
          requireLocation,
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
    const task = this.data.task as TaskDetail | null;
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

    // 已签到但尚未提交心得时，直接进入心得页
    if (task.check_in_status === 'submitted' && task.check_in_id) {
      wx.navigateTo({
        url: `/pages/reflection/index?checkInId=${task.check_in_id}&taskId=${taskId}&mode=create`,
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/checkin/index?taskId=${taskId}`,
    });
  },

  onModifyReflection() {
    const task = this.data.task as TaskDetail | null;
    const taskId = this.data.taskId as string;
    const checkInId = task?.check_in_id;
    const status = task?.check_in_status;
    if (!checkInId || !status) return;
    wx.navigateTo({
      url: `/pages/reflection/index?checkInId=${checkInId}&taskId=${taskId}&mode=edit&status=${status}`,
    });
  },

  onOpenLink(event: WechatMiniprogram.BaseEvent) {
    const { url } = event.currentTarget.dataset as { url?: string };
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      },
    });
  },
});
