import { get } from '../../services/api';
import { getStudyRecords } from '../../services/studyApi';
import { StudyRecordItem } from '../../services/studyApi';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CalendarCell {
  day: number;
  dayString: string;
  inMonth: boolean;
  checkedIn: boolean;
  status?: string;
  reflectionContent?: string | null;
  taskTitle?: string | null;
}

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

Page({
  data: {
    activeTab: 'calendar' as 'calendar' | 'tasks' | 'reflections',
    year: 2026,
    month: 1,
    monthText: '1月',
    weekdays: WEEKDAYS,
    days: [] as CalendarCell[],
    calendarLoading: true,
    calendarError: '',
    selectedDay: null as CalendarCell | null,
    showDetail: false,
    taskRecords: [] as StudyRecordItem[],
    reflectionRecords: [] as StudyRecordItem[],
    recordsLoading: true,
  },

  onLoad() {
    const now = new Date();
    this.setData({ year: now.getFullYear(), month: now.getMonth() + 1 });
    this.loadCalendar(this.data.year, this.data.month);
    this.loadRecords();
  },

  onShow() {
    if (this.data.days.length > 0) {
      this.loadCalendar(this.data.year, this.data.month);
    }
    this.loadRecords();
  },

  switchTab(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as 'calendar' | 'tasks' | 'reflections';
    this.setData({ activeTab: tab });
  },

  async loadCalendar(year: number, month: number) {
    this.setData({ calendarLoading: true, calendarError: '', monthText: `${month}月` });
    try {
      const res = await get<CalendarMonth>(`/api/checkins/calendar?year=${year}&month=${month}`);
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

  async loadRecords() {
    this.setData({ recordsLoading: true });
    try {
      const [taskRes, reflectionRes] = await Promise.all([
        getStudyRecords('task'),
        getStudyRecords('reflection'),
      ]);
      this.setData({
        taskRecords: taskRes.items,
        reflectionRecords: reflectionRes.items,
        recordsLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取记录失败';
      console.error('获取学习记录失败:', err);
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ recordsLoading: false });
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

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
});
