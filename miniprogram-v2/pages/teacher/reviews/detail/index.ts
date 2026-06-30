import {
  getPendingReviewDetail,
  submitReviewDecision,
  type PendingReviewItem,
  type ReviewDecision,
} from '../../../../services/reviewApi';

interface ReviewDetailItem extends PendingReviewItem {
  task_content?: string;
}

const REASON_MAP: Record<string, string> = {
  length_insufficient: '字数不足',
  sensitive_content: '包含敏感内容',
  template_phrase: '内容疑似套话',
  too_similar: '与任务内容重复度过高',
  llm_review_required: 'AI 建议人工复核',
  llm_error: 'AI 审核异常',
  ai_review_error: 'AI 审核异常',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

Page({
  data: {
    checkInId: '',
    item: null as ReviewDetailItem | null,
    loading: false,
    submitting: false,
    errorMsg: '',
    feedback: '',
    showFeedback: false,
    decision: '' as ReviewDecision | '',
  },

  onLoad(options: { id?: string }) {
    const checkInId = options.id || '';
    this.setData({ checkInId });
    if (checkInId) {
      this.loadDetail();
    } else {
      this.setData({ errorMsg: '打卡记录 ID 无效' });
    }
  },

  async loadDetail() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const item = await getPendingReviewDetail(this.data.checkInId);
      this.setData({ item: item as ReviewDetailItem });
    } catch (err) {
      this.setData({ errorMsg: err instanceof Error ? err.message : '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatReason(): string {
    const item = this.data.item;
    if (!item) return '';
    return REASON_MAP[item.ai_review_reason_code ?? ''] || item.ai_review_reason || '需人工复核';
  },

  formatTime(iso: string): string {
    return formatDateTime(iso);
  },

  displayStudent(item: ReviewDetailItem): string {
    if (item.student_name && item.student_name !== item.student_school_id) {
      return `${item.student_name}（${item.student_school_id}）`;
    }
    return item.student_school_id;
  },

  onFeedbackInput(e: WechatMiniprogram.Input) {
    this.setData({ feedback: e.detail.value });
  },

  chooseDecision(e: WechatMiniprogram.TouchEvent) {
    const decision = e.currentTarget.dataset.decision as ReviewDecision;
    this.setData({
      decision,
      showFeedback: decision === 'require_modification' || decision === 'reject',
    });
  },

  onBackTap() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/teacher/reviews/index' }) });
  },

  async submit() {
    const { decision, feedback, checkInId, submitting } = this.data;
    if (!decision || submitting) return;

    if (decision === 'require_modification' && !feedback.trim()) {
      wx.showToast({ title: '请输入修改说明', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await submitReviewDecision(checkInId, decision, feedback.trim() || undefined);
      wx.showToast({ title: '复核完成', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '提交失败',
        icon: 'none',
      });
      this.setData({ submitting: false });
    }
  },
});
