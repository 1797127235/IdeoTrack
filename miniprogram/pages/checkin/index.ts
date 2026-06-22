import { createCheckIn } from '../../services/checkinApi';

Page({
  data: {
    taskId: '',
    taskTitle: '定位签到',
    latitude: 0,
    longitude: 0,
    address: '',
    locationLoading: true,
    locationError: '',
    submitting: false,
  },

  onLoad(options: { taskId?: string; title?: string }) {
    const taskId = options.taskId || '';
    const taskTitle = options.title ? decodeURIComponent(options.title) : '定位签到';

    if (!taskId) {
      wx.showToast({ title: '任务信息缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    wx.setNavigationBarTitle({ title: taskTitle });
    this.setData({ taskId, taskTitle });
    this.loadLocation();
  },

  loadLocation() {
    this.setData({ locationLoading: true, locationError: '' });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          locationLoading: false,
        });
        this.reverseGeocode(res.latitude, res.longitude);
      },
      fail: (err) => {
        const isAuthDenied = err.errMsg?.includes('deny') || err.errMsg?.includes('auth');
        this.setData({
          locationLoading: false,
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

  async onSubmitCheckIn() {
    const { taskId, latitude, longitude, address, submitting } = this.data;

    if (submitting) return;
    if (!latitude || !longitude) {
      wx.showToast({ title: '请等待定位完成', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await createCheckIn({ task_id: taskId, latitude, longitude, address });
      if (res.success && res.data) {
        wx.showToast({ title: '签到成功', icon: 'success' });
        // Story 4.2：跳转到心得提交页
        // 当前用 navigateBack 回到任务详情，待 4.2 实现后替换
        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
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
