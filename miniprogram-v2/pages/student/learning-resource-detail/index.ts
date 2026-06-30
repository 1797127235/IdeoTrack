import { getLearningResourceById, LearningResource, getCoverImageUrl } from '../../../services/learningResourceApi';
import { getApiBaseUrl } from '../../../services/api';

Page({
  data: {
    resource: null as LearningResource | null,
    coverUrl: '',
    error: '',
    loading: true,
  },

  async onLoad(options: Record<string, string>) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '缺少资料ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
    await this.loadResource(id);
  },

  async loadResource(id: string) {
    try {
      const result = await getLearningResourceById(id);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '加载资料失败');
      }
      const resource = result.data;
      this.setData({
        resource,
        coverUrl: getCoverImageUrl(resource) || '',
        loading: false,
      });
    } catch (err) {
      this.setData({
        error: err instanceof Error ? err.message : '加载资料失败',
        loading: false,
      });
    }
  },

  onOpenUrl() {
    const resource = this.data.resource;
    if (!resource || !resource.url) {
      wx.showToast({ title: '暂无链接', icon: 'none' });
      return;
    }
    const url = resource.url.startsWith('http')
      ? resource.url
      : `${getApiBaseUrl()}${resource.url.startsWith('/') ? '' : '/'}${resource.url}`;

    const ext = (url.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      wx.previewImage({ urls: [url] });
      return;
    }

    if (ext === 'pdf') {
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.openDocument({ filePath: res.tempFilePath, showMenu: true });
          } else {
            wx.showToast({ title: '打开失败', icon: 'none' });
          }
        },
        fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
      });
      return;
    }

    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },

  onBackTap() {
    wx.navigateBack();
  },

  onRetry() {
    const resource = this.data.resource;
    if (resource) {
      this.loadResource(resource.id);
    }
  },
});
