import {
  listLearningResources,
  type LearningResource,
  type LearningResourceType,
  getCoverUrl,
  typeLabel,
} from '../../../services/learningResourceApi';

Page({
  data: {
    resources: [] as LearningResource[],
    loading: true,
    error: '',
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
    selectedType: '' as LearningResourceType | '',
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
      if (this.data.selectedType) {
        filters.type = this.data.selectedType;
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

  onTypeChange(e: { currentTarget: { dataset: { type?: LearningResourceType | '' } } }) {
    const type = e.currentTarget.dataset.type as LearningResourceType | '';
    this.setData({ selectedType: type, page: 1 });
    this.loadResources();
  },

  goToDetail(e: { currentTarget: { dataset: { id?: string } } }) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/learning-resources/detail/index?id=${id}` });
  },

  getCoverUrl,
  typeLabel,
});
