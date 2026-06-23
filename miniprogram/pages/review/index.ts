import { getPendingReviews, type PendingReviewItem } from '../../services/reviewApi';

const PAGE_SIZE = 20;

const REASON_MAP: Record<string, string> = {
  length_insufficient: '字数不足',
  sensitive_content: '包含敏感内容',
  template_phrase: '内容疑似套话',
  too_similar: '与任务内容重复度过高',
  llm_review_required: 'AI 建议人工复核',
  llm_error: 'AI 审核异常',
  ai_review_error: 'AI 审核异常',
};

Page({
  data: {
    items: [] as PendingReviewItem[],
    loading: false,
    errorMsg: '',
    hasMore: true,
    page: 1,
  },

  onShow() {
    this.setData({ page: 1, items: [], hasMore: true });
    this.loadReviews();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, items: [], hasMore: true, errorMsg: '' });
    this.loadReviews().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return;
    this.loadReviews();
  },

  async loadReviews() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getPendingReviews(this.data.page, PAGE_SIZE);
      const items = this.data.page === 1 ? data.items : [...this.data.items, ...data.items];
      this.setData({
        items,
        page: data.items.length > 0 ? data.page + 1 : data.page,
        hasMore: data.items.length === PAGE_SIZE && items.length < data.total,
      });
    } catch (err) {
      this.setData({ errorMsg: err instanceof Error ? err.message : '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatReason(item: PendingReviewItem): string {
    return (
      REASON_MAP[item.ai_review_reason_code ?? ''] || item.ai_review_reason || '需人工复核'
    );
  },

  onItemTap(e: WechatMiniprogram.BaseEvent) {
    const checkInId = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/review/detail/index?id=${checkInId}` });
  },
});
