import { createCheckIn } from '../../services/checkinApi';
import { getMyTaskDetail, type Task } from '../../services/taskApi';
import { formatDeadline } from '../../utils/format';

Page({
  data: {
    taskId: '',
    taskTitle: '定位签到',
    task: null as Task | null,
    deadlineText: '',
    taskLoading: true,
    taskError: '',
    latitude: 0,
    longitude: 0,
    address: '',
    locationLoading: true,
    locationReady: false,
    locationError: '',
    submitting: false,
  },

  onLoad(options: { taskId?: string; title?: string }) {
    const taskId = options.taskId || '';

    if (!taskId) {
      wx.showToast({ title: '任务信息缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ taskId });
    this.loadTaskDetail(taskId);
    this.loadLocation();
  },

  async loadTaskDetail(taskId: string) {
    this.setData({ taskLoading: true, taskError: '' });
    try {
      const res = await getMyTaskDetail(taskId);
      if (res.success && res.data) {
        const task = res.data;
        wx.setNavigationBarTitle({ title: task.title });
        this.setData({ task, taskTitle: task.title, deadlineText: formatDeadline(task.deadline_at), taskLoading: false });
      } else {
        this.setData({
          taskError: res.error?.message || '获取任务详情失败',
          taskLoading: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取任务详情失败';
      this.setData({ taskError: message, taskLoading: false });
    }
  },

  loadLocation() {
    this.setData({ locationLoading: true, locationReady: false, locationError: '' });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          locationLoading: false,
          locationReady: true,
        });
        this.reverseGeocode(res.latitude, res.longitude);
      },
      fail: (err) => {
        const isAuthDenied = err.errMsg?.includes('deny') || err.errMsg?.includes('auth');
        this.setData({
          locationLoading: false,
          locationReady: false,
          locationError: isAuthDenied
            ? '请开启定位权限以完成签到'
            : '获取位置失败，请重试',
        });
      },
    });
  },

  reverseGeocode(latitude: number, longitude: number) {
    // V1：使用腾讯地图或其他逆地理编码服务可选；此处仅做占位，可显示经纬度。
    // 如需真实地址，可在 V2 接入腾讯地图 SDK 或后端调用地理编码服务。
    this.setData({
      address: `纬度 ${latitude.toFixed(6)}, 经度 ${longitude.toFixed(6)}`,
    });
  },

  onOpenSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this.loadLocation();
        }
      },
    });
  },

  onRetryLocation() {
    this.loadLocation();
  },

  onRetryTask() {
    const { taskId } = this.data;
    if (taskId) {
      this.loadTaskDetail(taskId);
    }
  },

  async onSubmitCheckIn() {
    const { taskId, latitude, longitude, address, locationReady, submitting } = this.data;

    if (submitting) return;
    if (!locationReady) {
      wx.showToast({ title: '请等待定位完成', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await createCheckIn({ task_id: taskId, latitude, longitude, address });
      if (res.success && res.data) {
        wx.showToast({ title: '签到成功', icon: 'success' });
        const checkInId = res.data.id;
        wx.redirectTo({
          url: `/pages/reflection/index?checkInId=${checkInId}&taskId=${taskId}&mode=create`,
          fail: () => {
            wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
            this.setData({ submitting: false });
          },
        });
      } else {
        wx.showToast({
          title: res.error?.message || '签到失败',
          icon: 'none',
        });
        this.setData({ submitting: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '签到失败';
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ submitting: false });
    }
  },
});
