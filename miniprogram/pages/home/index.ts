import { getDailyQuote, type Quote } from '../../services/quoteApi';
import { listMyTasks, type StudentTask } from '../../services/taskApi';
import { getUserRole } from '../../utils/auth';
import { updateTabBarSelected } from '../../utils/tabBar';
import { formatDeadline } from '../../utils/format';
import { theme } from '../../theme';

interface TaskItem extends StudentTask {
  deadlineText: string;
  statusMeta: { label: string; color: string; bgColor: string };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function getRoleLabel(role: string | null): string {
  switch (role) {
    case 'student':
      return '同学';
    case 'counselor':
      return '辅导员';
    case 'admin':
      return '管理员';
    default:
      return '同学';
  }
}

function getStatusMeta(status: StudentTask['status']) {
  switch (status) {
    case 'completed':
      return { label: '已完成', color: theme.colors.success, bgColor: 'rgba(34,197,94,0.1)' };
    case 'reviewing':
      return { label: '复核中', color: theme.colors.warning, bgColor: 'rgba(245,158,11,0.1)' };
    case 'overdue':
      return { label: '已逾期', color: theme.colors.error, bgColor: 'rgba(239,68,68,0.1)' };
    default:
      return { label: '进行中', color: theme.colors.primary, bgColor: 'rgba(8,145,178,0.1)' };
  }
}

function buildTaskItem(task: StudentTask): TaskItem {
  return {
    ...task,
    deadlineText: formatDeadline(task.deadline_at),
    statusMeta: getStatusMeta(task.status),
  };
}

Page({
  data: {
    greeting: '',
    roleLabel: '',
    dateText: '',
    quote: null as Quote | null,
    quoteLoading: true,
    tasks: [] as TaskItem[],
    tasksLoading: true,
    streakDays: 5,
    totalPoints: 256,
    weekDays: [
      { day: 'Mon', label: '一', checked: true },
      { day: 'Tue', label: '二', checked: true },
      { day: 'Wed', label: '三', checked: true },
      { day: 'Thu', label: '四', checked: true },
      { day: 'Fri', label: '五', checked: false },
      { day: 'Sat', label: '六', checked: true },
      { day: 'Sun', label: '日', checked: true },
    ],
    loading: true,
    error: '',
    refreshing: false,
  },

  onShow() {
    updateTabBarSelected();
    this.setGreeting();
    this.loadData();
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadData().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  setGreeting() {
    const role = getUserRole();
    const now = new Date();
    const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    this.setData({
      greeting: getGreeting(),
      roleLabel: getRoleLabel(role),
      dateText,
    });
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    await Promise.all([this.loadQuote(), this.loadTasks()]);
    this.setData({ loading: false });
  },

  async loadQuote() {
    this.setData({ quoteLoading: true });
    try {
      const res = await getDailyQuote();
      if (res.success && res.data) {
        this.setData({ quote: res.data });
      } else {
        this.setData({ quote: null });
      }
    } catch {
      this.setData({ quote: null });
    } finally {
      this.setData({ quoteLoading: false });
    }
  },

  async loadTasks() {
    this.setData({ tasksLoading: true });
    try {
      const res = await listMyTasks(1, 10);
      if (res.success && res.data) {
        const tasks = res.data.map(buildTaskItem);
        this.setData({ tasks });
      } else {
        this.setData({ tasks: [] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取任务失败';
      this.setData({ error: message, tasks: [] });
    } finally {
      this.setData({ tasksLoading: false });
    }
  },

  goToCalendar() {
    wx.switchTab({ url: '/pages/calendar/index' });
  },

  goToTask(event: WechatMiniprogram.BaseEvent) {
    const { id } = event.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/task/detail/index?id=${id}` });
  },

  goToCheckIn(event: WechatMiniprogram.BaseEvent) {
    const { id } = event.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/checkin/index?taskId=${id}` });
  },
});
