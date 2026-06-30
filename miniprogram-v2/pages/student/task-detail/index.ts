import { getMyTaskDetail, TaskDetail } from '../../../services/taskApi';
import { createCheckIn, createCheckInWithPhoto, CreateCheckInData } from '../../../services/checkinApi';
import { getApiBaseUrl } from '../../../services/api';

interface CheckInForm {
  reflectionContent: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  facePhotoPath: string | null;
}

const statusLabelMap: Record<string, string> = {
  in_progress: '进行中',
  overdue: '已逾期',
  completed: '已完成',
  reviewing: '审核中',
};

const statusClassMap: Record<string, string> = {
  in_progress: 'pending',
  overdue: 'overdue',
  completed: 'completed',
  reviewing: 'pending',
};

const checkinStatusMap: Record<string, string> = {
  submitted: '已提交',
  ai_reviewing: 'AI审核中',
  ai_approved: 'AI已通过',
  pending_manual_review: '待人工复核',
  approved: '已通过',
  rejected: '被驳回',
  requires_modification: '需修改',
};

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

function formatDeadlineShort(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
}

function getMaterialInfo(task: TaskDetail): { name: string; duration: number } | null {
  const url = task.source_url || task.attachment_url;
  if (!url) return null;
  const name = decodeURIComponent(url.split('/').pop() || '学习材料');
  return { name, duration: 8 };
}

Page({
  data: {
    task: null as TaskDetail | null,
    taskId: '',
    statusLabel: '',
    statusClass: '',
    checkinTypeLabel: '',
    requirements: [] as string[],
    checkinStatusLabel: '',
    checkinStatusClass: '',
    aiReviewLabel: '',
    reviewFeedbackLabel: '',
    deadlineText: '',
    deadlineShort: '',
    requirementsText: '',
    attachmentName: '',
    coverImageUrl: null as string | null,
    canCheckIn: false,
    showReflection: false,
    showImageUpload: false,
    coverVisual: '',
    estimateText: '',
    currentStep: 0,
    progressPercent: 0,
    materialName: '',
    materialDuration: 8,
    form: {
      reflectionContent: '',
      latitude: null as number | null,
      longitude: null as number | null,
      address: '',
      facePhotoPath: null as string | null,
    } as CheckInForm,
    locating: false,
    faceCapturing: false,
    submitting: false,
    error: '',
  },

  async onLoad(options: Record<string, string>) {
    const taskId = options.id;
    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ taskId });
    await this.loadTask(taskId);
    this.loadDraft();
  },

  async loadTask(taskId: string) {
    try {
      const result = await getMyTaskDetail(taskId);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '加载任务失败');
      }
      const task = result.data;
      this.setTaskData(task);
    } catch (err) {
      this.setData({ error: err instanceof Error ? err.message : '加载任务失败' });
    }
  },

  setTaskData(task: TaskDetail) {
    const coverImageUrl = task.cover_image
      ? task.cover_image.startsWith('http')
        ? task.cover_image
        : `${getApiBaseUrl()}${task.cover_image.startsWith('/') ? '' : '/'}${task.cover_image}`
      : null;
    const requirements: string[] = [];
    if (task.require_text || this.hasCheckinType(task.checkin_type, 'text')) {
      const minLen = task.min_text_length ?? 0;
      requirements.push(`文字心得${minLen > 0 ? `不少于${minLen}字` : ''}`);
    }
    if (task.require_image || this.hasCheckinType(task.checkin_type, 'image')) {
      requirements.push('上传图片作为学习凭证');
    }
    if (task.require_video || this.hasCheckinType(task.checkin_type, 'video')) {
      requirements.push('上传视频作为学习凭证');
    }
    if (task.require_location) {
      requirements.push('需获取当前位置');
    }
    if (task.require_face) {
      requirements.push('需完成人脸核验');
    }

    const checkinTypeLabels: Record<CheckinType, string> = {
      text: '文字',
      image: '图片',
      video: '视频',
      mixed: '图文混合',
    };

    const checkinStatus = task.check_in_status || '';
    const aiReview = task.ai_review_reason || '';
    const reviewFeedback = task.review_feedback || '';

    const showReflection = task.require_text || this.hasCheckinType(task.checkin_type, 'text');
    const showImageUpload = task.require_image || this.hasCheckinType(task.checkin_type, 'image');

    const currentStep = task.status === 'completed' ? 3 : task.status === 'reviewing' ? 2 : task.check_in_status ? 2 : 1;
    const progressPercent = currentStep === 3 ? 100 : currentStep === 2 ? 66 : currentStep === 1 ? 33 : 0;

    const material = getMaterialInfo(task);

    this.setData({
      task,
      coverImageUrl,
      statusLabel: statusLabelMap[task.status] || task.status,
      statusClass: statusClassMap[task.status] || '',
      checkinTypeLabel: task.checkin_type ? checkinTypeLabels[task.checkin_type] : '文字',
      requirements,
      requirementsText: requirements.length ? requirements.join(' / ') : '无',
      deadlineText: task.deadline_at ? formatDeadline(task.deadline_at) : '暂无',
      deadlineShort: task.deadline_at ? formatDeadlineShort(task.deadline_at) : '暂无',
      attachmentName: task.attachment_url ? task.attachment_url.split('/').pop() || '附件' : '',
      materialName: material?.name ?? '',
      materialDuration: material?.duration ?? 8,
      checkinStatusLabel: checkinStatus ? (checkinStatusMap[checkinStatus] || checkinStatus) : '未提交',
      checkinStatusClass: checkinStatus === 'approved' || checkinStatus === 'ai_approved' ? 'completed' : checkinStatus === 'rejected' || checkinStatus === 'requires_modification' ? 'overdue' : 'pending',
      aiReviewLabel: aiReview || (checkinStatus ? '提交后显示' : '暂无'),
      reviewFeedbackLabel: reviewFeedback || '暂无',
      canCheckIn: task.status === 'in_progress',
      showReflection,
      showImageUpload,
      coverVisual: this.pickCoverVisual(task.title),
      estimateText: '15 分钟',
      currentStep,
      progressPercent,
    });
  },

  hasCheckinType(type: string | undefined, target: string): boolean {
    if (!type) return false;
    if (type === target) return true;
    if (target === 'text' && type === 'mixed') return true;
    if (target === 'image' && type === 'mixed') return true;
    return false;
  },

  pickCoverVisual(title: string): string {
    if (title.includes('视频')) return 'video';
    if (title.includes('志愿服务') || title.includes('实践')) return 'service';
    return 'book';
  },

  onReflectionInput(e: WechatMiniprogram.TextareaInput) {
    this.setData({ 'form.reflectionContent': e.detail.value });
  },

  onLocateTap() {
    this.setData({ locating: true });
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => this.doLocate(),
            fail: (err) => {
              this.setData({ locating: false });
              if (err.errMsg?.includes('auth deny')) {
                wx.showModal({
                  title: '需要位置权限',
                  content: '请在设置中允许使用位置信息',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) wx.openSetting();
                  },
                });
              } else {
                wx.showToast({ title: '位置授权失败', icon: 'none' });
              }
            },
          });
        } else {
          this.doLocate();
        }
      },
      fail: () => {
        this.setData({ locating: false });
        wx.showToast({ title: '获取权限失败', icon: 'none' });
      },
    });
  },

  doLocate() {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      timeout: 10000,
      success: (res) => {
        this.setData({
          'form.latitude': res.latitude,
          'form.longitude': res.longitude,
          'form.address': `${res.latitude.toFixed(5)}, ${res.longitude.toFixed(5)}`,
          locating: false,
        });
      },
      fail: (err) => {
        this.setData({ locating: false });
        wx.showToast({ title: `定位失败：${err.errMsg || ''}`, icon: 'none' });
      },
    });
  },

  onFaceVerifyTap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'front',
      success: (res) => {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;
        this.setData({
          'form.facePhotoPath': tempFile.tempFilePath,
          faceCapturing: false,
        });
        wx.showToast({ title: '人脸照片已拍摄', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '拍照取消或失败', icon: 'none' });
      },
    });
  },

  async onSubmit() {
    if (this.data.submitting) return;

    const { task, form } = this.data;
    if (!task) return;

    const needText = task.require_text || this.hasCheckinType(task.checkin_type, 'text');
    const minLen = task.min_text_length ?? 0;
    if (needText && (!form.reflectionContent.trim() || form.reflectionContent.trim().length < minLen)) {
      wx.showToast({ title: minLen > 0 ? `心得不少于${minLen}字` : '请输入学习心得', icon: 'none' });
      return;
    }

    if (task.require_location && (form.latitude === null || form.longitude === null)) {
      wx.showToast({ title: '请先获取定位', icon: 'none' });
      return;
    }

    if (task.require_face && !form.facePhotoPath) {
      wx.showToast({ title: '请先完成人脸核验', icon: 'none' });
      return;
    }

    const payload: CreateCheckInData = {
      task_id: task.id,
      reflection_content: form.reflectionContent.trim() || undefined,
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      address: form.address || undefined,
    };

    this.setData({ submitting: true });
    try {
      if (task.require_face && form.facePhotoPath) {
        const result = await createCheckInWithPhoto(payload, form.facePhotoPath);
        if (!result.success || !result.data) {
          throw new Error(result.error?.message || '打卡失败');
        }
      } else {
        const result = await createCheckIn(payload);
        if (!result.success || !result.data) {
          throw new Error(result.error?.message || '打卡失败');
        }
      }
      wx.showToast({ title: '打卡成功', icon: 'success' });
      setTimeout(() => {
        this.loadTask(task.id);
      }, 800);
    } catch (err) {
      wx.showToast({ title: err instanceof Error ? err.message : '打卡失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  onPreviewAttachment() {
    const url = this.data.task?.attachment_url;
    if (!url) return;
    const ext = (url.split('.').pop() || '').toLowerCase();
    const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url.startsWith('/api') ? url : `/api/upload/attachment?path=${encodeURIComponent(url)}`}`;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      wx.previewImage({ urls: [fullUrl] });
    } else if (ext === 'pdf') {
      wx.downloadFile({
        url: fullUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.openDocument({ filePath: res.tempFilePath, showMenu: true });
          }
        },
      });
    } else {
      wx.setClipboardData({ data: fullUrl });
    }
  },

  onBackTap() {
    wx.navigateBack();
  },

  onRetry() {
    this.setData({ error: '' });
    this.loadTask(this.data.taskId);
  },

  onOpenMaterial() {
    const task = this.data.task;
    if (!task) return;
    const url = task.source_url || task.attachment_url;
    if (!url) return;
    const ext = (url.split('.').pop() || '').toLowerCase();
    const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url.startsWith('/api') ? url : `/api/upload/attachment?path=${encodeURIComponent(url)}`}`;
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      wx.previewImage({ urls: [fullUrl] });
    } else if (ext === 'pdf') {
      wx.downloadFile({
        url: fullUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.openDocument({ filePath: res.tempFilePath, showMenu: true });
          }
        },
      });
    } else {
      wx.setClipboardData({ data: fullUrl });
    }
  },

  onUploadPlaceholder() {
    wx.showToast({ title: '图片凭证暂不支持', icon: 'none' });
  },

  onSaveDraft() {
    const { taskId, form } = this.data;
    if (!taskId) return;
    wx.setStorageSync(`task_draft_${taskId}`, form.reflectionContent);
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  loadDraft() {
    const { taskId } = this.data;
    if (!taskId) return;
    const draft = wx.getStorageSync(`task_draft_${taskId}`);
    if (draft && typeof draft === 'string') {
      this.setData({ 'form.reflectionContent': draft });
    }
  },
});
