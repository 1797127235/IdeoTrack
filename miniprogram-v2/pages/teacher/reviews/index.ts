import { getPendingReviews, PendingReviewItem  } from '../../../services/reviewApi';
import { getRole } from '../../../utils/token';

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

Page({
  data: {
    items: [] as PendingReviewItem[],
    loading: false,
    errorMsg: '',
    hasMore: true,
    page: 1,
    filterTaskId: '',
    filterTaskTitle: '',
  },

  onLoad(options: Record<string, string>) {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }
    const taskId = options.task_id || '';
    const taskTitle = decodeURIComponent(options.task_title || '');
    this.setData({ page: 1, items: [], hasMore: true, filterTaskId: taskId, filterTaskTitle: taskTitle });
    this.loadReviews(1);
  },

  onShow() {
    this.setData({ page: 1, items: [], hasMore: true, errorMsg: '' });
    this.loadReviews(1);
  },

  onPullDownRefresh() {
    this.setData({ page: 1, items: [], hasMore: true, errorMsg: '' });
    this.loadReviews(1).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return;
    this.loadReviews();
  },

  async loadReviews(page?: number) {
    const currentPage = page ?? this.data.page;
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getPendingReviews(currentPage, PAGE_SIZE, this.data.filterTaskId);
      const newItems = data.items;
      const items = currentPage === 1 ? newItems : [...this.data.items, ...newItems];
      this.setData({
        items,
        page: currentPage + 1,
        hasMore: newItems.length === PAGE_SIZE && items.length < data.total,
      });
    } catch (err) {
      this.setData({ errorMsg: err instanceof Error ? err.message : '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatReason(item: PendingReviewItem): string {
    return REASON_MAP[item.ai_review_reason_code ?? ''] || item.ai_review_reason || '需人工复核';
  },

  formatTime(iso: string): string {
    return formatDateTime(iso);
  },

  displayStudent(item: PendingReviewItem): string {
    if (item.student_name && item.student_name !== item.student_school_id) {
      return `${item.student_name}（${item.student_school_id}）`;
    }
    return item.student_school_id;
  },

  onBackTap() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/teacher/dashboard/index' }) });
  },

  onClearTaskFilter() {
    this.setData({ filterTaskId: '', filterTaskTitle: '', page: 1, items: [], hasMore: true });
    this.loadReviews(1);
  },

  onItemTap(e: WechatMiniprogram.TouchEvent) {
    const checkInId = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/teacher/reviews/detail/index?id=${checkInId}` });
  },
});
