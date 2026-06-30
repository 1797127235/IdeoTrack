import { getApiBaseUrl } from '../../../services/api';
import { exportTaskCheckIns, getTaskCheckInDetail, sendReminders, TaskCheckInDetail, TaskCheckInStudent } from '../../../services/counselorApi';

Page({
  data: {
    taskId: '',
    detail: null as TaskCheckInDetail | null,
    summary: {
      total: 0,
      checked: 0,
      absent: 0,
      rate: '0.0',
    },
    deadlineText: '',
    activeTab: 'absent',
    loading: true,
    error: '',
    reminding: false,
    exporting: false,
  },

  async onLoad(options: Record<string, string>) {
    const taskId = options.id;
    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ taskId });
    await this.loadDetail(taskId);
  },

  async loadDetail(taskId: string) {
    try {
      this.setData({ loading: true, error: '' });
      const detail = await getTaskCheckInDetail(taskId);
      const total = detail.classes.reduce((sum, c) => sum + c.total_students, 0);
      const checked = detail.classes.reduce((sum, c) => sum + c.checked_count, 0);
      const absent = detail.classes.reduce((sum, c) => sum + c.absent_count, 0);
      const rate = total > 0 ? ((checked / total) * 100).toFixed(1) : '0.0';
      this.setData({
        detail,
        summary: { total, checked, absent, rate },
        deadlineText: this.formatDeadline(detail.task.deadline_at),
        loading: false,
      });
    } catch (err) {
      this.setData({
        error: err instanceof Error ? err.message : '加载失败',
        loading: false,
      });
    }
  },

  onTabChange(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;
    this.setData({ activeTab: key });
  },

  onRemindAll() {
    const { detail } = this.data;
    if (!detail || detail.absent_students.length === 0) {
      wx.showToast({ title: '没有未打卡学生', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '一键提醒',
      content: `将向 ${detail.absent_students.length} 名未打卡学生发送提醒，确定吗？`,
      confirmText: '发送',
      success: (res) => {
        if (res.confirm) this.doRemind(detail.absent_students);
      },
    });
  },

  async doRemind(students: TaskCheckInStudent[]) {
    if (this.data.reminding) return;
    this.setData({ reminding: true });

    const { taskId } = this.data;
    const byClass = new Map<string, TaskCheckInStudent[]>();
    for (const s of students) {
      const list = byClass.get(s.class_id) || [];
      list.push(s);
      byClass.set(s.class_id, list);
    }

    let successCount = 0;
    let failCount = 0;

    for (const [classId, list] of byClass) {
      try {
        await sendReminders(classId, taskId, list.map((s) => s.student_id));
        successCount += list.length;
      } catch {
        failCount += list.length;
      }
    }

    this.setData({ reminding: false });
    wx.showModal({
      title: '提醒结果',
      content: `成功提醒 ${successCount} 人${failCount > 0 ? `，失败 ${failCount} 人` : ''}`,
      showCancel: false,
    });
  },

  async onExport() {
    const { taskId, detail } = this.data;
    if (!detail) return;

    if (this.data.exporting) return;
    this.setData({ exporting: true });

    try {
      const { download_url } = await exportTaskCheckIns(taskId);
      wx.downloadFile({
        url: `${getApiBaseUrl()}${download_url}`,
        success: (res) => {
          if (res.statusCode !== 200) {
            wx.showToast({ title: '文件下载失败', icon: 'none' });
            return;
          }
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'xlsx',
            showMenu: true,
          });
        },
        fail: () => wx.showToast({ title: '文件下载失败', icon: 'none' }),
      });
    } catch (err) {
      wx.showToast({ title: err instanceof Error ? err.message : '导出失败', icon: 'none' });
    } finally {
      this.setData({ exporting: false });
    }
  },

  onBackTap() {
    wx.navigateBack();
  },

  onRetry() {
    this.loadDetail(this.data.taskId);
  },

  formatDeadline(iso: string): string {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hour}:${minute}`;
  },
});
