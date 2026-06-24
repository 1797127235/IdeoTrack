import { get } from '../../../services/api';
import { fetchTaskPool, type Task } from '../../../services/taskApi';
import { getUserRole } from '../../../utils/auth';
import { updateTabBarSelected } from '../../../utils/tabBar';

interface CalendarDayData {
  day: string;
  checked_in: boolean;
  status?: string;
  reflection_content?: string | null;
  task_title?: string | null;
}

interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDayData[];
}

async function fetchStudentCalendar(year: number, month: number) {
  return get<CalendarMonth>(`/api/checkins/calendar?year=${year}&month=${month}`);
}

interface CalendarCell {
  day: number;
  dayString: string;
  inMonth: boolean;
  checkedIn: boolean;
  status?: string;
  reflectionContent?: string | null;
  taskTitle?: string | null;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateCalendarDays(
  year: number,
  month: number,
  checkedInMap: Record<string, CalendarDayData>
): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay();

  const cells: CalendarCell[] = [];

  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dayString = formatDateString(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, day);
    cells.push({ day, dayString, inMonth: false, checkedIn: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayString = formatDateString(year, month, day);
    const data = checkedInMap[dayString];
    cells.push({
      day,
      dayString,
      inMonth: true,
      checkedIn: !!data?.checked_in,
      status: data?.status,
      reflectionContent: data?.reflection_content,
      taskTitle: data?.task_title,
    });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const dayString = formatDateString(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, day);
    cells.push({ day, dayString, inMonth: false, checkedIn: false });
  }

  return cells;
}

interface DispatchedTask extends Task {
  source_task_id: string;
}

Page({
  data: {
    role: '' as string,
    // Calendar
    year: 2026,
    month: 1,
    monthText: '1月',
    weekdays: WEEKDAYS,
    days: [] as CalendarCell[],
    calendarLoading: true,
    calendarError: '',
    selectedDay: null as CalendarCell | null,
    showDetail: false,
    // Tasks
    poolTasks: [] as Task[],
    dispatchedTasks: [] as DispatchedTask[],
    tasksLoading: true,
  },

  onShow() {
    updateTabBarSelected();
    const role = getUserRole() || '';
    this.setData({ role });
    if (role === 'counselor') {
      this.loadTasks();
    } else {
      const now = new Date();
      this.setData({ year: now.getFullYear(), month: now.getMonth() + 1 });
      this.loadCalendar(this.data.year, this.data.month);
    }
  },

  onPullDownRefresh() {
    const promise = this.data.role === 'counselor'
      ? this.loadTasks()
      : this.loadCalendar(this.data.year, this.data.month);
    promise.finally(() => wx.stopPullDownRefresh());
  },

  async loadCalendar(year: number, month: number) {
    this.setData({ calendarLoading: true, calendarError: '', monthText: `${month}月` });
    try {
      const res = await fetchStudentCalendar(year, month);
      if (res.success && res.data) {
        const checkedInMap: Record<string, CalendarDayData> = {};
        res.data.days.forEach((d) => {
          checkedInMap[d.day] = d;
        });
        const days = generateCalendarDays(year, month, checkedInMap);
        this.setData({ days, calendarLoading: false });
      } else {
        this.setData({ calendarError: res.error?.message || '获取日历失败', calendarLoading: false, days: [] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取日历失败';
      this.setData({ calendarError: message, calendarLoading: false, days: [] });
    }
  },

  prevMonth() {
    const { year, month } = this.data;
    const newDate = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    this.setData(newDate);
    this.loadCalendar(newDate.year, newDate.month);
  },

  nextMonth() {
    const { year, month } = this.data;
    const newDate = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    this.setData(newDate);
    this.loadCalendar(newDate.year, newDate.month);
  },

  onSelectDay(event: WechatMiniprogram.BaseEvent) {
    const { daystring } = event.currentTarget.dataset;
    const cell = this.data.days.find((d) => d.dayString === daystring);
    if (!cell || !cell.inMonth) return;
    if (!cell.checkedIn) {
      wx.showToast({ title: '当日未打卡', icon: 'none' });
      return;
    }
    this.setData({ selectedDay: cell, showDetail: true });
  },

  closeDetail() {
    this.setData({ showDetail: false, selectedDay: null });
  },

  noop() {
    // 阻止弹窗内容点击冒泡到遮罩
  },

  async loadTasks() {
    this.setData({ tasksLoading: true });
    try {
      const [poolRes, listRes] = await Promise.all([
        fetchTaskPool(),
        get<{ items: Task[] }>('/api/tasks'),
      ]);
      this.setData({
        poolTasks: poolRes.data?.items ?? [],
        dispatchedTasks: (listRes.data?.items ?? []).filter(
          (t): t is DispatchedTask => !!t.source_task_id
        ),
        tasksLoading: false,
      });
    } catch (err) {
      this.setData({ tasksLoading: false });
      wx.showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' });
    }
  },

  dispatchTask(event: WechatMiniprogram.BaseEvent) {
    const taskId = event.currentTarget.dataset.id as string;
    wx.navigateTo({ url: `/pages/counselor/task-dispatch/index?taskId=${taskId}` });
  },
});
