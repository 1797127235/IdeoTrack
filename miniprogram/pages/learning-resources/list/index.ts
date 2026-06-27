import {
  listLearningResources,
  type LearningResource,
  getCoverUrl,
  typeLabel,
} from '../../../services/learningResourceApi';

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: '思政理论', label: '思政理论' },
  { value: '专题视频', label: '专题视频' },
  { value: '红色教育', label: '红色教育' },
  { value: '阅读材料', label: '阅读材料' },
];

Page({
  data: {
    resources: [] as LearningResource[],
    loading: true,
    error: '',
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
    selectedCategory: '' as string,
    categories: CATEGORIES,
  },

  onLoad() {
    this.loadResources();
  },

  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.loadResources().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadResources(true);
    }
  },

  async loadResources(append = false) {
    this.setData({ loading: true, error: '' });
    try {
      const filters: Parameters<typeof listLearningResources>[0] = {
        status: 'published',
        page: this.data.page,
        limit: this.data.limit,
      };
      if (this.data.selectedCategory) {
        filters.category = this.data.selectedCategory;
      }

      const result = await listLearningResources(filters);
      const resources = result.data?.items || [];
      const total = result.data?.total || 0;

      this.setData({
        resources: append ? [...this.data.resources, ...resources] : resources,
        total,
        hasMore: this.data.page * this.data.limit < total,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      this.setData({ error: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onCategoryChange(e: { currentTarget: { dataset: { category?: string } } }) {
    const category = e.currentTarget.dataset.category || '';
    this.setData({ selectedCategory: category, page: 1 });
    this.loadResources();
  },

  goToDetail(e: { currentTarget: { dataset: { id?: string } } }) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/learning-resources/detail/index?id=${id}` });
  },

  getCoverUrl,
  typeLabel,
});
