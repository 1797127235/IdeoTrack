import {
  getHighRiskStudents,
  type HighRiskStudentList,
} from '../../../services/counselorApi';

Page({
  data: {
    list: {
      window_size: 7,
      absent_threshold: 3,
      students: [],
    } as HighRiskStudentList,
    loading: true,
    errorMsg: '',
  },

  onShow() {
    this.loadStudents();
  },

  onPullDownRefresh() {
    this.loadStudents().finally(() => wx.stopPullDownRefresh());
  },

  async loadStudents() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getHighRiskStudents();
      this.setData({ list: data });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToClassDetail(event: WechatMiniprogram.BaseEvent) {
    const { id, classId } = event.currentTarget.dataset as { id?: string; classId?: string };
    if (!id || !classId) return;
    wx.navigateTo({
      url: `/pages/counselor/class-detail/index?classId=${encodeURIComponent(classId)}&className=${encodeURIComponent('班级详情')}`,
    });
  },
});
