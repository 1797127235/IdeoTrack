"use client";

import { createCheckIn, createCheckInWithPhoto, reverseGeocode } from '../../../services/checkinApi';
import { CreateCheckInData } from '../../../services/checkinApi';
import { getMyTaskDetail } from '../../../services/taskApi';
import { TaskDetail } from '../../../services/taskApi';
import { formatDeadline } from '../../../utils/format';
import { theme } from '../../../theme';

type StepStatus = 'pending' | 'current' | 'completed';

interface TaskStep {
  index: number;
  title: string;
  desc: string;
  status: StepStatus;
}

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

function getStatusMeta(status: TaskDetail['status']) {
  switch (status) {
    case 'completed':
      return { label: '已完成', color: theme.colors.success };
    case 'reviewing':
      return { label: '复核中', color: theme.colors.warning };
    case 'overdue':
      return { label: '已逾期', color: theme.colors.error };
    default:
      return { label: '进行中', color: theme.colors.primary };
  }
}

function getReviewStatusMeta(status: string) {
  switch (status) {
    case 'approved':
      return { label: '已通过', color: theme.colors.success, icon: '✓' };
    case 'rejected':
      return { label: '未通过', color: theme.colors.error, icon: '✕' };
    case 'requires_modification':
      return { label: '要求修改', color: theme.colors.warning, icon: '!' };
    case 'pending_manual_review':
      return { label: '待复核', color: theme.colors.warning, icon: '…' };
    default:
      return null;
  }
}

function getReviewReasonText(reasonCode: string | undefined, reason: string | undefined): string {
  switch (reasonCode) {
    case 'length_insufficient':
      return '字数不足';
    case 'sensitive_content':
      return '包含敏感内容';
    case 'template_phrase':
      return '内容疑似套话';
    case 'too_similar':
      return '与任务内容重复度过高';
    case 'llm_review_required':
    case 'llm_error':
    case 'ai_review_error':
      return 'AI 建议人工复核';
    default:
      return reason || '需人工复核';
  }
}

function canModifyReflection(task: TaskDetail): boolean {
  const status = task.check_in_status || '';
  if (status === 'requires_modification') return true;
  if (status === 'pending_manual_review' && task.reflection_modified !== true) return true;
  return false;
}

Page({
  data: {
    taskId: '',
    task: null as TaskDetail | null,
    loading: true,
    error: '',
    statusLabel: '',
    statusColor: theme.colors.textSecondary as string,
    buttonText: '立即打卡',
    buttonDisabled: true,
    showModifyReflection: false,
    deadlineText: '',
    requireLocation: false,
    canCheckIn: false,
    canSubmit: false,
    reflectionContent: '',
    latitude: 0,
    longitude: 0,
    address: '',
    locationLoading: false,
    locationError: '',
    outOfRange: false,
    submitting: false,
    requireFace: false,
    photoPath: '',
    photoPreview: '',
    faceStatusText: '',
    faceStatusType: '',
    reviewMeta: null as { label: string; color: string; icon: string } | null,
    reviewReasonText: '',
  },

  onLoad(options: { id?: string }) {
    const taskId = options.id || '';
    if (!taskId) {
      this.setData({ loading: false, error: '任务 ID 缺失' });
      return;
    }
    this.setData({ taskId });
    this.loadTaskDetail(taskId);
  },

  async loadTaskDetail(taskId: string) {
    this.setData({ loading: true, error: '' });
    try {
      const res = await getMyTaskDetail(taskId);
      if (res.success && res.data) {
        const task = res.data;
        const statusMeta = getStatusMeta(task.status);
        const reviewMeta = getReviewStatusMeta(task.check_in_status || '');
        const reviewReasonText = getReviewReasonText(task.ai_review_reason_code, task.ai_review_reason);
        const requireLocation = task.geo_lat != null && task.geo_lng != null && task.geo_radius_meters != null;
        const requireFace = !!task.require_face;

        const canCheckIn = task.status === 'in_progress';
        let buttonText = '立即打卡';
        let buttonDisabled = false;

        if (task.status === 'completed') {
          buttonText = '已完成';
          buttonDisabled = true;
        } else if (task.status === 'overdue') {
          buttonText = '已逾期';
          buttonDisabled = true;
        } else if (task.check_in_status === 'submitted') {
          buttonText = '去写心得';
          buttonDisabled = false;
        } else if (task.check_in_status === 'rejected') {
          buttonText = '未通过复核';
          buttonDisabled = true;
        } else if (task.check_in_status === 'requires_modification') {
          buttonText = '需修改心得';
          buttonDisabled = false;
        } else if (task.check_in_status === 'pending_manual_review') {
          buttonText = '等待辅导员复核';
          buttonDisabled = true;
        }

        this.setData({
          task,
          loading: false,
          statusLabel: statusMeta.label,
          statusColor: statusMeta.color,
          buttonText,
          buttonDisabled,
          showModifyReflection: canModifyReflection(task),
          deadlineText: formatDeadline(task.deadline_at),
          requireLocation,
          requireFace,
          canCheckIn,
          reflectionContent: task.reflection_content || '',
          reviewMeta,
          reviewReasonText,
        });

        if (canCheckIn && requireLocation) {
          this.loadLocation();
        }

        this.updateCanSubmit();
      } else {
        this.setData({ error: res.error?.message || '获取任务详情失败', loading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取任务详情失败';
      this.setData({ error: message, loading: false });
    }
  },

  loadLocation() {
    this.setData({ locationLoading: true, locationError: '', outOfRange: false });
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
          outOfRange,
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
        this.updateCanSubmit();
      },
    });
  },

  reverseGeocode(latitude: number, longitude: number) {
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
        this.updateCanSubmit();
      });
  },

  onReflectionInput(e: WechatMiniprogram.TextareaInput) {
    this.setData({ reflectionContent: e.detail.value || '' });
    this.updateCanSubmit();
  },

  /** 人脸打卡：唤起系统相机拍一张现场照 */
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
          faceStatusText: '照片已拍摄，填写心得后提交开始人脸验证',
          faceStatusType: 'pending',
        });
        this.updateCanSubmit();
      },
      fail: (err) => {
        if (!err.errMsg?.includes('cancel')) {
          wx.showToast({ title: '拍照失败，请重试', icon: 'none' });
        }
      },
    });
  },

  /** 重新拍照 */
  onRetakePhoto() {
    this.setData({
      photoPath: '',
      photoPreview: '',
      faceStatusText: '',
      faceStatusType: '',
    });
    this.onTakePhoto();
  },

  updateCanSubmit() {
    const { reflectionContent, requireLocation, locationLoading, locationError, requireFace, photoPath } = this.data;
    const hasReflection = reflectionContent.trim().length >= 10;
    // 演示环境：放开位置签到范围前端预判（与后端一致），不再用 outOfRange 拦截提交。
    const locationReady = !requireLocation || (!locationLoading && !locationError && !!this.data.address);
    const photoReady = !requireFace || !!photoPath;
    this.setData({ canSubmit: hasReflection && locationReady && photoReady });
  },

  async onSubmit() {
    const { taskId, reflectionContent, requireLocation, latitude, longitude, address, canSubmit, submitting, requireFace, photoPath } = this.data;
    if (!canSubmit || submitting) return;

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
      const payload: CreateCheckInData = {
        task_id: taskId,
        reflection_content: reflectionContent.trim(),
      };
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
            faceStatusText: '人脸验证通过，打卡成功',
            faceStatusType: 'success',
          });
        }
        wx.showToast({ title: requireFace ? '验证通过' : '打卡成功', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/checkin/result/index?checkInId=${res.data!.id}&taskId=${taskId}&status=${res.data!.status}`,
          });
        }, requireFace ? 1200 : 800);
      } else {
        const message = res.error?.message || '打卡失败';
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
      const message = err instanceof Error ? err.message : '打卡失败';
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

  onModifyReflection() {
    const { task, taskId } = this.data;
    if (!task?.check_in_id) return;
    wx.navigateTo({
      url: `/pages/reflection/index?checkInId=${task.check_in_id}&taskId=${taskId}&mode=modify`,
    });
  },

  onRetry() {
    const { taskId } = this.data;
    if (taskId) {
      this.loadTaskDetail(taskId);
    }
  },

  onOpenLink(e: WechatMiniprogram.BaseEvent) {
    const url = e.currentTarget.dataset.url as string;
    if (url) {
      wx.setClipboardData({
        data: url,
        success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
      });
    }
  },
});
