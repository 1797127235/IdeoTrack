import {
  getLearningResource,
  getCoverUrl,
  typeLabel,
  type LearningResource,
} from '../../../services/learningResourceApi';

Page({
  data: {
    id: '',
    resource: null as LearningResource | null,
    loading: true,
    error: '',
  },

  onLoad(options: { id?: string }) {
    const id = options?.id || '';
    if (!id) {
      this.setData({ error: '资料 ID 无效', loading: false });
      return;
    }
    this.setData({ id });
    this.loadResource(id);
  },

  async loadResource(id: string) {
    this.setData({ loading: true, error: '' });
    try {
      const result = await getLearningResource(id);
      this.setData({ resource: result.data || null });
      if (result.data?.title) {
        wx.setNavigationBarTitle({ title: result.data.title });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      this.setData({ error: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  previewCover() {
    const resource = this.data.resource;
    if (!resource?.cover_url) return;
    wx.previewImage({
      urls: [getCoverUrl(resource.id)],
      current: getCoverUrl(resource.id),
    });
  },

  copyUrl() {
    const url = this.data.resource?.url;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      },
    });
  },

  getCoverUrl,
  typeLabel,
});
