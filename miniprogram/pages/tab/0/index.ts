import { getDailyQuote, type Quote } from '../../../services/quoteApi';
import { listMyTasks, type StudentTask } from '../../../services/taskApi';
import {
  getCounselorDashboard,
  getClassStudentList,
  type ClassDashboardItem,
  type CounselorTaskDashboardItem,
  type ClassStudentItem,
} from '../../../services/counselorApi';
import { getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';
import { formatDeadline } from '../../../utils/format';
import { theme } from '../../../theme';

interface TaskItem extends StudentTask {
  deadlineText: string;
  statusMeta: { label: string; color: string; bgColor: string };
}

interface DashboardSummary {
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
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

function buildSummary(classes: ClassDashboardItem[]): DashboardSummary {
  const total = classes.reduce((sum, c) => sum + c.total_students, 0);
  const checked = classes.reduce((sum, c) => sum + c.checked_in_count, 0);
  return {
    total_students: total,
    checked_in_count: checked,
    check_in_rate: total > 0 ? Math.round((checked / total) * 100) : 0,
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
    homeError: '',
    // Counselor dashboard
    currentTask: null as CounselorTaskDashboardItem | null,
    summary: null as DashboardSummary | null,
    classes: [] as ClassDashboardItem[],
    focusStudents: [] as ClassStudentItem[],
    focusLoading: false,
    dashLoading: true,
    dashErrorMsg: '',
    // Common
    refreshing: false,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({ role });
    this.setGreeting();
    if (role === 'counselor') {
      this.loadCounselorData();
    } else {
      this.loadStudentData();
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    const promise = this.data.role === 'counselor' ? this.loadCounselorData() : this.loadStudentData();
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
    await Promise.all([this.loadQuote(), this.loadTasks()]);
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
      this.setData({ homeError: message, tasks: [] });
    } finally {
      this.setData({ tasksLoading: false });
    }
  },

  async loadCounselorData() {
    this.setData({ dashLoading: true, dashErrorMsg: '' });
    try {
      const data = await getCounselorDashboard();
      const currentTask = data.tasks[0] ?? null;
      const classes = currentTask?.classes ?? [];
      this.setData({
        currentTask,
        classes,
        summary: currentTask ? buildSummary(classes) : null,
      });
      if (classes.length > 0 && currentTask) {
        this.loadFocusStudents(classes[0].class_id, currentTask.task_id);
      } else {
        this.setData({ focusStudents: [] });
      }
    } catch (err) {
      this.setData({
        dashErrorMsg: err instanceof Error ? err.message : '加载失败',
        classes: [],
        summary: null,
        currentTask: null,
        focusStudents: [],
      });
    } finally {
      this.setData({ dashLoading: false });
    }
  },

  async loadFocusStudents(classId: string, taskId: string) {
    this.setData({ focusLoading: true });
    try {
      const data = await getClassStudentList(classId, taskId, 'absent');
      this.setData({ focusStudents: data.students.slice(0, 5) });
    } catch (err) {
      console.error('加载重点关注学生失败:', err);
      this.setData({ focusStudents: [] });
    } finally {
      this.setData({ focusLoading: false });
    }
  },

  goToCalendar() {
    wx.switchTab({ url: '/pages/tab/2/index' });
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
    const taskId = this.data.currentTask?.task_id;
    if (!id || !taskId) {
      wx.showToast({ title: '班级或任务信息缺失', icon: 'none' });
      return;
    }
    const className = name || '班级详情';
    const url = `/pages/counselor/class-detail/index?classId=${encodeURIComponent(id)}&className=${encodeURIComponent(className)}&taskId=${encodeURIComponent(taskId)}`;
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
