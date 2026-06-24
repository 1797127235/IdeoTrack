import { getCheckInResult, type CheckInResultSummary } from '../../../services/checkinApi';
import { getMyTaskDetail, type TaskDetail } from '../../../services/taskApi';
import { isUuid } from '../../../utils/validators';

const VALID_STATUSES: string[] = [
  'ai_approved',
  'pending_manual_review',
  'requires_modification',
  'approved',
  'rejected',
];

function isValidStatus(value: string): boolean {
  return VALID_STATUSES.includes(value);
}

function truncateText(text: string | undefined, maxLength = 120): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

function canModifyReflection(task: TaskDetail): boolean {
  const editableStatuses: string[] = [
    'submitted',
    'ai_reviewing',
    'pending_manual_review',
    'requires_modification',
  ];
  if (!editableStatuses.includes(task.check_in_status || '')) return false;
  if (task.check_in_status === 'requires_modification') return true;
  return task.reflection_modified !== true;
}

function getReviewReasonText(reasonCode: string | undefined, reason: string | undefined): string {
  switch (reasonCode) {
    case 'length_insufficient':
      return '再多写一点吧～';
    case 'sensitive_content':
      return '心得包含不适合的内容，请修改后重新提交';
    case 'template_phrase':
      return '心得可以再具体一点，避免套用常见表达';
    case 'too_similar':
      return '心得与任务内容过于相似，请写下自己的真实体会';
    case 'llm_review_required':
    case 'llm_error':
    case 'ai_review_error':
      return '心得可以再具体一点，说说你的真实感受吧';
    default:
      if (!reason) return '心得可以再具体一点，说说你的真实感受吧';
      switch (reason) {
        case '字数不足':
          return '再多写一点吧～';
        case '包含敏感内容':
          return '心得包含不适合的内容，请修改后重新提交';
        case '内容疑似套话':
          return '心得可以再具体一点，避免套用常见表达';
        case '与任务内容重复度过高':
          return '心得与任务内容过于相似，请写下自己的真实体会';
        case 'LLM 判定需复核':
        case 'AI 审核异常，转人工复核':
          return '心得可以再具体一点，说说你的真实感受吧';
        default:
          return '心得可以再具体一点，说说你的真实感受吧';
      }
  }
}

Page({
  data: {
    checkInId: '',
    taskId: '',
    status: 'ai_approved' as string,
    task: null as TaskDetail | null,
    taskLoading: true,
    taskError: '',
    reflectionSummary: '',
    showModifyReflection: false,
    reviewReasonText: '',
    result: null as CheckInResultSummary | null,
    resultLoading: true,
    resultError: '',
    totalPoints: 256,
    today: '',
  },

  onLoad(options: { checkInId?: string; taskId?: string; status?: string }) {
    const checkInId = options.checkInId || '';
    const taskId = options.taskId || '';
    const status = options.status || '';

    if (!isUuid(checkInId) || !isUuid(taskId) || !isValidStatus(status)) {
      wx.showToast({ title: '页面参数无效', icon: 'none' });
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/home/index' });
        }
      }, 1500);
      return;
    }

    this.setData({ checkInId, taskId, status, resultLoading: true });

    if (status === 'ai_approved') {
      this.triggerVibrate();
    }

    this.setToday();
    this.loadTaskDetail(taskId);
    this.loadCheckInResult(checkInId);
  },

  triggerVibrate() {
    try {
      wx.vibrateShort({ type: 'light' });
    } catch {
      // 用户可能关闭震动权限，静默忽略
    }
  },

  async loadTaskDetail(taskId: string) {
    this.setData({ taskLoading: true, taskError: '' });
    try {
      const res = await getMyTaskDetail(taskId);
      if (res.success && res.data) {
        const task = res.data;
        const reflectionSummary = truncateText(task.reflection_content);
        const showModifyReflection = canModifyReflection(task);
        const reviewReasonText = getReviewReasonText(task.ai_review_reason_code, task.ai_review_reason);
        wx.setNavigationBarTitle({
          title: task.status === 'completed' ? '打卡成功' : '打卡结果',
        });
        this.setData({
          task,
          reflectionSummary,
          showModifyReflection,
          reviewReasonText,
          taskLoading: false,
        });
      } else {
        this.setData({
          taskError: res.error?.message || '获取任务详情失败',
          taskLoading: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取任务详情失败';
      this.setData({ taskError: message, taskLoading: false });
    }
  },

  setToday() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ today: dateStr });
  },

  async loadCheckInResult(checkInId: string) {
    this.setData({ resultLoading: true, resultError: '' });
    try {
      const res = await getCheckInResult(checkInId);
      if (res.success && res.data) {
        this.setData({
          result: res.data,
          totalPoints: 256 + res.data.base_points,
          resultLoading: false,
        });
      } else {
        this.setData({
          resultError: res.error?.message || '获取打卡结果失败',
          resultLoading: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取打卡结果失败';
      this.setData({ resultError: message, resultLoading: false });
    }
  },

  onRetryTask() {
    const { taskId } = this.data;
    if (taskId) {
      this.loadTaskDetail(taskId);
    }
  },

  onRetryResult() {
    const { checkInId } = this.data;
    if (checkInId) {
      this.loadCheckInResult(checkInId);
    }
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  onGoCalendar() {
    wx.switchTab({ url: '/pages/calendar/index' });
  },

  onGoTaskDetail() {
    const { taskId } = this.data;
    if (!taskId) return;
    wx.redirectTo({ url: `/pages/task/detail/index?id=${taskId}` });
  },

  onEditReflection() {
    const { checkInId, taskId, status } = this.data;
    if (!checkInId || !taskId) return;
    wx.redirectTo({
      url: `/pages/reflection/index?checkInId=${checkInId}&taskId=${taskId}&mode=edit&status=${status}`,
    });
  },
});
