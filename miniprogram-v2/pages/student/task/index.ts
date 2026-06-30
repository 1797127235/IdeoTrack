import { listMyTasks, StudentTask } from '../../../services/taskApi';
import { getApiBaseUrl } from '../../../services/api';

type FrontendStatus = 'pending' | 'progress' | 'done';

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `截止 ${month}月${day}日 ${hour}:${minute}`;
}

function truncate(text: string, max = 80): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function mapBackendStatus(status: StudentTask['status']): FrontendStatus {
  if (status === 'in_progress' || status === 'overdue') return 'pending';
  if (status === 'reviewing') return 'progress';
  return 'done';
}

function statusLabel(status: FrontendStatus): string {
  const map: Record<FrontendStatus, string> = {
    pending: '待完成',
    progress: '进行中',
    done: '已完成',
  };
  return map[status];
}

function actionText(status: FrontendStatus): string {
  const map: Record<FrontendStatus, string> = {
    pending: '去完成',
    progress: '继续学习',
    done: '已完成',
  };
  return map[status];
}

function pickVisual(title: string, status: FrontendStatus): string {
  if (status === 'done') return 'flag';
  if (title.includes('视频')) return 'video';
  if (title.includes('志愿服务') || title.includes('实践')) return 'service';
  return 'book';
}

function transformTask(task: StudentTask) {
  const status = mapBackendStatus(task.status);
  return {
    id: task.id,
    title: task.title,
    summary: truncate(task.content),
    deadline: formatDeadline(task.deadline_at),
    estimate: '预计 15 分钟',
    points: '+15 积分',
    status,
    statusLabel: statusLabel(status),
    actionText: actionText(status),
    visual: pickVisual(task.title, status),
    attachmentUrl: task.attachment_url ?? null,
  };
}

Page({
  data: {
    activeStatus: 'all',
    taskTabs: [
      { key: 'all', label: '全部', active: true },
      { key: 'pending', label: '待完成', active: false },
      { key: 'progress', label: '进行中', active: false },
      { key: 'done', label: '已完成', active: false },
    ],
    tasks: [] as ReturnType<typeof transformTask>[],
    visibleTasks: [] as ReturnType<typeof transformTask>[],
    totalCount: 0,
    pendingCount: 0,
    tabs: [
      { key: 'home', label: '首页', icon: 'home', active: false },
      { key: 'task', label: '任务', icon: 'clipboard', active: true },
      { key: 'growth', label: '成长', icon: 'star', active: false },
      { key: 'mine', label: '我的', icon: 'user', active: false },
    ],
  },

  async onLoad() {
    await this.loadTasks();
  },

  async loadTasks() {
    try {
      const result = await listMyTasks(1, 50);
      const items = result.success && result.data ? result.data : [];
      const tasks = items.map(transformTask);
      const pendingCount = tasks.filter((t) => t.status === 'pending').length;

      this.setData({
        tasks,
        visibleTasks: tasks,
        totalCount: tasks.length,
        pendingCount,
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '任务加载失败',
        icon: 'none',
      });
    }
  },

  onBackTap() {
    wx.redirectTo({ url: '/pages/student/home/index' });
  },

  onSearchTap() {
    wx.showToast({ title: '搜索开发中', icon: 'none' });
  },

  onFilterTap() {
    wx.showToast({ title: '筛选开发中', icon: 'none' });
  },

  onStatusTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;
    const visibleTasks = key === 'all' ? this.data.tasks : this.data.tasks.filter((task) => task.status === key);

    this.setData({
      activeStatus: key,
      visibleTasks,
      taskTabs: this.data.taskTabs.map((item) => ({
        ...item,
        active: item.key === key,
      })),
    });
  },

  onTaskAction(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset;

    if (!id) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      return;
    }

    wx.navigateTo({ url: `/pages/student/task-detail/index?id=${id}` });
  },

  previewOrDownloadAttachment(url: string) {
    const ext = (url.split('.').pop() || '').toLowerCase();
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else if (url.startsWith('/')) {
      fullUrl = `${getApiBaseUrl()}${url}`;
    } else {
      fullUrl = `${getApiBaseUrl()}/api/upload/attachment?path=${encodeURIComponent(url)}`;
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      wx.previewImage({ urls: [fullUrl] });
    } else if (ext === 'pdf') {
      wx.downloadFile({
        url: fullUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.openDocument({ filePath: res.tempFilePath, showMenu: true });
          } else {
            wx.showToast({ title: '附件打开失败', icon: 'none' });
          }
        },
        fail: () => wx.showToast({ title: '附件下载失败', icon: 'none' }),
      });
    } else {
      wx.showModal({
        title: '附件',
        content: '该附件需要在浏览器中下载查看',
        confirmText: '复制链接',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({ data: fullUrl });
          }
        },
      });
    }
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'task') {
      return;
    }

    if (key === 'home') {
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }

    if (key === 'growth') {
      wx.redirectTo({ url: '/pages/student/growth/index' });
      return;
    }

    if (key === 'mine') {
      wx.redirectTo({ url: '/pages/student/mine/index' });
      return;
    }
  },
});
