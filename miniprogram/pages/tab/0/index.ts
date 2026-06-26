import { getDailyQuote, type Quote } from '../../../services/quoteApi';
import { listMyTasks, type StudentTask } from '../../../services/taskApi';
import {
  getCounselorDashboard,
  getHighRiskStudents,
  type CounselorTaskDashboardItem,
  type HighRiskStudentList,
} from '../../../services/counselorApi';
import { getMeStats, type MeStatsResponse } from '../../../services/authApi';
import { getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';
import { formatDeadline } from '../../../utils/format';
import { theme } from '../../../theme';

interface TaskItem extends StudentTask {
  deadlineText: string;
  statusMeta: { label: string; color: string; bgColor: string };
}

interface DashboardTaskItem extends CounselorTaskDashboardItem {
  deadlineText: string;
}

interface WeekDay {
  day: string;
  label: string;
  checked: boolean;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function buildWeekDays(recent7Days: Array<{ date: string; checkedIn: boolean }>): WeekDay[] {
  const today = new Date();
  const days: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const record = recent7Days.find((item) => item.date === dateStr);
    days.push({
      day: dateStr,
      label: WEEKDAY_LABELS[d.getDay()],
      checked: record?.checkedIn ?? false,
    });
  }
  return days;
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

function buildDashboardTaskItem(task: CounselorTaskDashboardItem): DashboardTaskItem {
  return {
    ...task,
    deadlineText: formatDeadline(task.deadline_at),
  };
}

Page({
  data: {
    role: '' as string,
    // Student home
    greeting: '',
    roleLabel: '',
    homeDateText: '',
    quote: null as Quote | null,
    quoteLoading: true,
    tasks: [] as TaskItem[],
    displayedTasks: [] as TaskItem[],
    searchKeyword: '',
    showSearch: false,
    tasksLoading: true,
    sortAsc: true,
    streakDays: 0,
    totalPoints: 0,
    weekDays: [] as WeekDay[],
    statsLoading: true,
    homeError: '',
    // Counselor dashboard
    dashTasks: [] as DashboardTaskItem[],
    dashLoading: true,
    dashErrorMsg: '',
    highRisk: {
      window_size: 7,
      absent_threshold: 3,
      students: [],
    } as HighRiskStudentList,
    highRiskLoading: true,
    highRiskErrorMsg: '',
    // Common
    refreshing: false,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({ role });
    this.setGreeting();
    if (role === 'counselor') {
      this.loadCounselorDashboard();
    } else {
      this.loadStudentData();
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    const promise = this.data.role === 'counselor' ? this.loadCounselorDashboard() : this.loadStudentData();
    promise.finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  setGreeting() {
    const role = getUserRole();
    const now = new Date();
    const homeDateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    this.setData({
      greeting: getGreeting(),
      roleLabel: getRoleLabel(role),
      homeDateText,
    });
  },

  async loadStudentData() {
    this.setData({ homeError: '' });
    await Promise.all([this.loadQuote(), this.loadTasks(), this.loadStats()]);
  },

  async loadStats() {
    this.setData({ statsLoading: true });
    try {
      const stats = await getMeStats();
      const weekDays = buildWeekDays(stats.recent7Days);
      this.setData({
        streakDays: stats.currentStreak,
        totalPoints: stats.points,
        weekDays,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取成长数据失败';
      console.error('获取成长数据失败:', err);
      this.setData({ homeError: message });
    } finally {
      this.setData({ statsLoading: false });
    }
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
      const res = await listMyTasks(1, 50);
      if (res.success && res.data) {
        const tasks = res.data.map(buildTaskItem).sort((a, b) => {
          const deadlineDiff = new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
          return this.data.sortAsc ? deadlineDiff : -deadlineDiff;
        });
        this.setData({ tasks });
        this.applyFilter();
      } else {
        this.setData({ tasks: [], displayedTasks: [] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取任务失败';
      this.setData({ homeError: message, tasks: [], displayedTasks: [] });
    } finally {
      this.setData({ tasksLoading: false });
    }
  },

  toggleSearch() {
    const showSearch = !this.data.showSearch;
    this.setData({ showSearch });
    if (!showSearch) {
      this.clearSearch();
    }
  },

  toggleSort() {
    const sortAsc = !this.data.sortAsc;
    this.setData({ sortAsc });
    this.loadTasks();
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    const searchKeyword = e.detail.value || '';
    this.setData({ searchKeyword });
    this.applyFilter();
  },

  applyFilter() {
    const { tasks, searchKeyword } = this.data;
    const keyword = searchKeyword.trim().toLowerCase();
    const displayedTasks = keyword
      ? tasks.filter((t) => t.title.toLowerCase().includes(keyword) || (t.content ?? '').toLowerCase().includes(keyword))
      : tasks;
    this.setData({ displayedTasks });
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilter();
  },

  async loadCounselorDashboard() {
    this.setData({ dashLoading: true, dashErrorMsg: '', highRiskLoading: true, highRiskErrorMsg: '' });

    const dashPromise = getCounselorDashboard()
      .then((data) => {
        this.setData({ dashTasks: data.tasks.map(buildDashboardTaskItem) });
      })
      .catch((err) => {
        this.setData({
          dashErrorMsg: err instanceof Error ? err.message : '加载失败',
          dashTasks: [],
        });
      });

    const highRiskPromise = getHighRiskStudents()
      .then((data) => {
        this.setData({ highRisk: data });
      })
      .catch((err) => {
        this.setData({
          highRiskErrorMsg: err instanceof Error ? err.message : '加载失败',
        });
      });

    await Promise.all([dashPromise, highRiskPromise]);
    this.setData({ dashLoading: false, highRiskLoading: false });
  },

  goToHighRiskStudents() {
    wx.navigateTo({ url: '/pages/counselor/high-risk-students/index' });
  },

  goToCalendar() {
    wx.navigateTo({ url: '/pages/calendar/index' });
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

  goToTaskClasses(event: WechatMiniprogram.BaseEvent) {
    const { id, title } = event.currentTarget.dataset as { id?: string; title?: string };
    if (!id) {
      wx.showToast({ title: '任务信息缺失', icon: 'none' });
      return;
    }
    const url = `/pages/counselor/classes/index?taskId=${encodeURIComponent(id)}&taskName=${encodeURIComponent(title || '任务详情')}`;
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
