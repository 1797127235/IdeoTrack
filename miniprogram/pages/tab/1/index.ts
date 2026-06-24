import {
  getCounselorDashboard,
  type ClassDashboardItem,
} from '../../../services/counselorApi';
import { getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';
import { toBeijingDateString } from '../../../utils/date';

Page({
  data: {
    role: '' as string,
    date: toBeijingDateString(),
    classes: [] as ClassDashboardItem[],
    loading: true,
    errorMsg: '',
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({ role });
    if (role === 'counselor') {
      this.loadClasses();
    }
  },

  onPullDownRefresh() {
    if (this.data.role === 'counselor') {
      this.loadClasses().finally(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  async loadClasses() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getCounselorDashboard(this.data.date);
      this.setData({ classes: data.classes });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        classes: [],
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToClassDetail(event: WechatMiniprogram.BaseEvent) {
    const { id, name } = event.currentTarget.dataset as { id?: string; name?: string };
    if (!id) {
      wx.showToast({ title: '班级信息缺失', icon: 'none' });
      return;
    }
    const url = `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(name || '班级详情')}&date=${encodeURIComponent(this.data.date)}`;
    wx.navigateTo({ url });
  },
});
