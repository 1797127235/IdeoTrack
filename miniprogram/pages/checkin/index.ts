import { createCheckIn, createCheckInWithPhoto, reverseGeocode } from '../../services/checkinApi';
import { CreateCheckInData } from '../../services/checkinApi';
import { getMyTaskDetail } from '../../services/taskApi';
import { TaskDetail } from '../../services/taskApi';
import { formatDeadline } from '../../utils/format';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371000 * c;
}

Page({
  data: {
    taskId: '',
    taskTitle: '任务打卡',
    task: null as TaskDetail | null,
    deadlineText: '',
    taskLoading: true,
    taskError: '',
    requireLocation: false,
    latitude: 0,
    longitude: 0,
    latitudeText: '',
    longitudeText: '',
    address: '',
    locationLoading: false,
    locationReady: true,
    locationError: '',
    submitting: false,
    geofenceHint: '',
    outOfRange: false,
    requireFace: false,
    photoPath: '',
    photoPreview: '',
    faceStatusText: '',
    faceStatusType: '',
  },

  onLoad(options: { taskId?: string }) {
    const taskId = options.taskId || '';

    if (!taskId) {
      wx.showToast({ title: '任务信息缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ taskId });
    this.loadTaskDetail(taskId);
  },

  async loadTaskDetail(taskId: string) {
    this.setData({ taskLoading: true, taskError: '' });
    try {
      const res = await getMyTaskDetail(taskId);
      if (res.success && res.data) {
        const task = res.data;
        wx.setNavigationBarTitle({ title: task.title });
        const requireLocation = task.geo_lat != null && task.geo_lng != null && task.geo_radius_meters != null;
        const requireFace = !!task.require_face;
        const geofenceHint = requireLocation
          ? `该任务需在「${task.geo_address || '指定位置'}」${task.geo_radius_meters} 米范围内签到`
          : '该任务无需定位，直接确认打卡即可';

        this.setData({
          task,
          taskTitle: task.title,
          deadlineText: formatDeadline(task.deadline_at),
          taskLoading: false,
          requireLocation,
          requireFace,
          geofenceHint,
        });

        if (requireLocation) {
          this.loadLocation();
        }
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
        const { task } = this.data;
        let outOfRange = false;
        if (task?.geo_lat != null && task?.geo_lng != null && task?.geo_radius_meters != null) {
          const distance = haversineDistance(
            res.latitude,
            res.longitude,
            task.geo_lat,
            task.geo_lng
          );
          outOfRange = distance > task.geo_radius_meters;
        }
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          latitudeText: res.latitude.toFixed(6),
          longitudeText: res.longitude.toFixed(6),
          locationLoading: true,
          locationReady: true,
          outOfRange,
        });
        this.reverseGeocode(res.latitude, res.longitude);
      },
      fail: (err) => {
        const isAuthDenied = err.errMsg?.includes('deny') || err.errMsg?.includes('auth');
        this.setData({
          locationLoading: false,
          locationReady: false,
          locationError: isAuthDenied ? '请开启定位权限以完成签到' : '获取位置失败，请重试',
        });
      },
    });
  },

  reverseGeocode(latitude: number, longitude: number) {
    this.setData({ locationLoading: true });
    reverseGeocode(latitude, longitude)
      .then((res) => {
        if (res.success && res.data) {
          this.setData({ address: res.data.formattedAddress || res.data.address });
        } else {
          this.setData({ address: `纬度 ${latitude.toFixed(6)}, 经度 ${longitude.toFixed(6)}` });
        }
      })
      .catch(() => {
        this.setData({ address: `纬度 ${latitude.toFixed(6)}, 经度 ${longitude.toFixed(6)}` });
      })
      .finally(() => {
        this.setData({ locationLoading: false });
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

  onTakePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        const file = res.tempFiles[0];
        this.setData({
          photoPath: file.tempFilePath,
          photoPreview: file.tempFilePath,
          faceStatusText: '照片已拍摄，正在准备上传验证',
          faceStatusType: 'pending',
        });

        if (!this.data.requireLocation || this.data.locationReady) {
          this.onSubmitCheckIn();
        }
      },
      fail: (err) => {
        if (!err.errMsg?.includes('cancel')) {
          wx.showToast({ title: '拍照失败，请重试', icon: 'none' });
        }
      },
    });
  },

  onRetakePhoto() {
    this.setData({
      photoPath: '',
      photoPreview: '',
      faceStatusText: '',
      faceStatusType: '',
    });
    this.onTakePhoto();
  },

  async onSubmitCheckIn() {
    const {
      taskId,
      latitude,
      longitude,
      address,
      locationReady,
      submitting,
      outOfRange,
      requireLocation,
      requireFace,
      photoPath,
    } = this.data;

    if (submitting) return;
    if (requireLocation && !locationReady) {
      wx.showToast({ title: '请等待定位完成', icon: 'none' });
      return;
    }
    if (requireLocation && outOfRange) {
      wx.showToast({ title: '当前不在签到范围内', icon: 'none' });
      return;
    }
    if (requireFace && !photoPath) {
      wx.showToast({ title: '请先拍摄人脸照片', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    if (requireFace) {
      this.setData({
        faceStatusText: '正在上传照片并进行人脸验证...',
        faceStatusType: 'verifying',
      });
    }
    wx.showLoading({
      title: requireFace ? '上传验证中...' : '提交中...',
      mask: true,
    });

    try {
      const payload: CreateCheckInData = { task_id: taskId };
      if (requireLocation) {
        payload.latitude = latitude;
        payload.longitude = longitude;
        payload.address = address;
      }

      const res = requireFace && photoPath
        ? await createCheckInWithPhoto(payload, photoPath)
        : await createCheckIn(payload);

      wx.hideLoading();

      if (res.success && res.data) {
        if (requireFace) {
          this.setData({
            faceStatusText: '人脸验证通过，签到成功',
            faceStatusType: 'success',
          });
        }
        wx.showToast({ title: requireFace ? '验证通过' : '签到成功', icon: 'success' });
        const checkInId = res.data.id;
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/reflection/index?checkInId=${checkInId}&taskId=${taskId}&mode=create`,
            fail: () => {
              wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
              this.setData({ submitting: false });
            },
          });
        }, requireFace ? 1200 : 0);
      } else {
        const message = res.error?.message || '签到失败';
        if (requireFace) {
          this.setData({
            faceStatusText: message,
            faceStatusType: 'error',
          });
        }
        wx.showToast({ title: message, icon: 'none' });
        this.setData({ submitting: false });
      }
    } catch (err) {
      wx.hideLoading();
      const message = err instanceof Error ? err.message : '签到失败';
      if (requireFace) {
        this.setData({
          faceStatusText: message,
          faceStatusType: 'error',
        });
      }
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ submitting: false });
    }
  },
});
