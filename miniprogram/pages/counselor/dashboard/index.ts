import {
  getCounselorDashboard,
  getClassStudentList,
  type ClassDashboardItem,
  type DashboardSummary,
  type ClassStudentItem,
} from '../../../services/counselorApi';

import { updateTabBarSelected } from '../../../utils/tabBar';
import { formatDateText, toBeijingDateString } from '../../../utils/date';

Page({
  data: {
    date: toBeijingDateString(),
    dateText: '',
    summary: null as DashboardSummary | null,
    classes: [] as ClassDashboardItem[],
    focusStudents: [] as ClassStudentItem[],
    focusLoading: false,
    loading: true,
    errorMsg: '',
    refreshing: false,
  },

  onShow() {
    updateTabBarSelected();
    this.loadDashboard();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadDashboard().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  async loadDashboard() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getCounselorDashboard(this.data.date);
      this.setData({
        date: data.date,
        dateText: formatDateText(data.date),
        summary: data.summary,
        classes: data.classes,
      });
      // 加载重点关注学生（取第一个班级的未打卡学生）
      if (data.classes.length > 0) {
        this.loadFocusStudents(data.classes[0].class_id, data.date);
      }
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        classes: [],
        summary: null,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadFocusStudents(classId: string, date: string) {
    this.setData({ focusLoading: true });
    try {
      const data = await getClassStudentList(classId, 'absent', date);
      this.setData({ focusStudents: data.students.slice(0, 5) });
    } catch (err) {
      console.error('加载重点关注学生失败:', err);
      this.setData({ focusStudents: [] });
    } finally {
      this.setData({ focusLoading: false });
    }
  },

  remindStudent(event: WechatMiniprogram.BaseEvent) {
    const { studentId, studentName } = event.currentTarget.dataset as { studentId?: string; studentName?: string };
    if (!studentId) return;
    wx.showModal({
      title: '发送提醒',
      content: `确定要提醒 ${studentName || '该学生'} 打卡吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '提醒已发送', icon: 'success' });
        }
      },
    });
  },

  goToClassDetail(event: WechatMiniprogram.BaseEvent) {
    const { id, name } = event.currentTarget.dataset as { id?: string; name?: string };
    if (!id) {
      wx.showToast({ title: '班级信息缺失', icon: 'none' });
      return;
    }
    const className = name || '班级详情';
    const url = `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(className)}&date=${encodeURIComponent(this.data.date)}`;
    wx.navigateTo({
      url,
      fail: (err) => {
        console.error('[navigateTo fail]', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      },
    });
  },

  goToExport() {
    wx.navigateTo({
      url: '/pages/counselor/export/index',
      fail: (err) => {
        console.error('[navigateTo export fail]', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      },
    });
  },
});
