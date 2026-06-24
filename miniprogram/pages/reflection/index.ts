import { submitReflection } from '../../services/checkinApi';
import { getMyTaskDetail, type TaskDetail } from '../../services/taskApi';
import { isUuid } from '../../utils/validators';

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
      // 兼容旧数据：未返回 reason_code 时按原 reason 文案兜底
      if (!reason) return '';
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
    mode: 'create' as 'create' | 'edit',
    editStatus: '' as string,
    task: null as TaskDetail | null,
    taskLoading: true,
    taskError: '',
    content: '',
    contentLength: 0,
    contentError: '',
    reviewReason: '',
    reviewReasonCode: '',
    reviewReasonText: '',
    reviewFeedback: '',
    submitting: false,
  },

  onLoad(options: { checkInId?: string; taskId?: string; mode?: string; status?: string }) {
    const checkInId = options.checkInId || '';
    const taskId = options.taskId || '';
    const mode = options.mode === 'edit' ? 'edit' : 'create';
    const editStatus = options.status || '';

    if (!isUuid(checkInId) || !isUuid(taskId)) {
      wx.showToast({ title: '页面参数无效', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ checkInId, taskId, mode, editStatus });
    this.loadTaskDetail(taskId);
  },

  async loadTaskDetail(taskId: string) {
    this.setData({ taskLoading: true, taskError: '' });
    try {
      const res = await getMyTaskDetail(taskId);
      if (res.success && res.data) {
        const task = res.data;
        const isEditMode = this.data.mode === 'edit';
        const title = isEditMode ? '修改心得' : '提交心得';
        wx.setNavigationBarTitle({ title });

        if (isEditMode) {
          const editableStatuses: string[] = [
            'submitted',
            'ai_reviewing',
            'pending_manual_review',
            'requires_modification',
          ];
          if (!editableStatuses.includes(task.check_in_status || '')) {
            wx.showToast({ title: '当前状态不允许修改心得', icon: 'none' });
            setTimeout(() => wx.navigateBack(), 1500);
            return;
          }
          // requires_modification 由辅导员触发，允许无限次修改
          if (task.check_in_status !== 'requires_modification' && task.reflection_modified === true) {
            wx.showToast({ title: '你已经修改过一次心得', icon: 'none' });
            setTimeout(() => wx.navigateBack(), 1500);
            return;
          }
        }

        // 修改模式下回显已有内容与复核原因
        let content = '';
        let reviewReason = '';
        let reviewReasonCode = '';
        if (isEditMode && task.reflection_content) {
          content = task.reflection_content;
          reviewReason = task.ai_review_reason || '';
          reviewReasonCode = task.ai_review_reason_code || '';
        }
        const reviewFeedback = isEditMode ? task.review_feedback || '' : '';
        const trimmed = content.trim();
        const contentLength = trimmed.length;
        const contentError = this.validateContent(content);

        this.setData({
          task,
          taskLoading: false,
          content,
          contentLength,
          contentError,
          reviewReason,
          reviewReasonCode,
          reviewReasonText: getReviewReasonText(reviewReasonCode, reviewReason),
          reviewFeedback,
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

  onContentInput(e: WechatMiniprogram.TextareaInput) {
    const content = e.detail.value || '';
    const trimmed = content.trim();
    const length = trimmed.length;
    const contentError = this.validateContent(content);
    this.setData({ content, contentLength: length, contentError });
  },

  validateContent(content: string): string {
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      return '再多写一点吧～';
    }
    if (trimmed.length > 500) {
      return '心得不能超过 500 字';
    }
    return '';
  },

  onRetryTask() {
    const { taskId } = this.data;
    if (taskId) {
      this.loadTaskDetail(taskId);
    }
  },

  async onSubmit() {
    const { checkInId, content, submitting, mode } = this.data;
    const trimmed = content.trim();

    if (submitting) return;

    const contentError = this.validateContent(content);
    if (contentError || trimmed.length < 10 || trimmed.length > 500) {
      this.setData({ contentError: contentError || '心得字数需在 10–500 字之间' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await submitReflection(checkInId, trimmed);
      if (res.success && res.data) {
        const status = res.data.status;
        const reflectionCheckInId = res.data.id;
        const reflectionTaskId = res.data.task_id;
        wx.redirectTo({
          url: `/pages/checkin/result/index?checkInId=${reflectionCheckInId}&taskId=${reflectionTaskId}&status=${status}`,
        });
      } else {
        const code = res.error?.code;
        let message = res.error?.message || (mode === 'edit' ? '保存失败' : '提交失败');
        if (code === 'CHECKIN_DEADLINE_PASSED') {
          message = '任务已截止，无法修改心得';
        } else if (code === 'CHECKIN_CANNOT_MODIFY_REFLECTION') {
          message = '当前状态不允许修改心得';
        } else if (code === 'CHECKIN_REFLECTION_ALREADY_MODIFIED') {
          message = '你已经修改过一次，无法再次修改';
        }
        wx.showToast({ title: message, icon: 'none' });
        this.setData({ submitting: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (mode === 'edit' ? '保存失败' : '提交失败');
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ submitting: false });
    }
  },
});
