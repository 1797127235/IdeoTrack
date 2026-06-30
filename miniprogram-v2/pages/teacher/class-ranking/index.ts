import { getClassRanking } from '../../../services/counselorApi';

interface ClassRankingItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_count: number;
  completion_rate: number;
}

interface PageData {
  loading: boolean;
  error: string;
  weekLabel: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  ranking: ClassRankingItem[];
  periods: { key: string; label: string }[];
}

const PERIODS: { key: string; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
];

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getMonthStart(d: Date): Date {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    loading: true,
    error: '',
    weekLabel: '本周',
    dateRange: '',
    startDate: '',
    endDate: '',
    ranking: [],
    periods: PERIODS,
  } as PageData,

  onLoad() {
    const today = new Date();
    const start = getWeekStart(today);
    const end = today;
    this.setData({
      startDate: formatDate(start),
      endDate: formatDate(end),
      dateRange: `${formatDate(start)} ~ ${formatDate(end)}`,
    });
    this.loadRanking();
  },

  async loadRanking() {
    this.setData({ loading: true, error: '' });
    try {
      const { startDate, endDate } = this.data;
      const data = await getClassRanking(
        startDate || undefined,
        endDate || undefined
      );
      this.setData({
        ranking: data,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      this.setData({ loading: false, error: message });
    }
  },

  onWeekFilterTap() {
    wx.showActionSheet({
      itemList: this.data.periods.map((p) => p.label),
      success: (res) => {
        const selected = this.data.periods[res.tapIndex];
        this.setPeriod(selected.key);
      },
    });
  },

  setPeriod(key: string) {
    const today = new Date();
    let start: Date = today;
    let end: Date = today;
    let label = '全部';

    if (key === 'week') {
      start = getWeekStart(today);
      label = '本周';
    } else if (key === 'month') {
      start = getMonthStart(today);
      label = '本月';
    } else {
      start = new Date('2020-01-01');
      label = '全部';
    }

    this.setData({
      weekLabel: label,
      startDate: formatDate(start),
      endDate: formatDate(end),
      dateRange: `${formatDate(start)} ~ ${formatDate(end)}`,
    });
    this.loadRanking();
  },

  onItemTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const name = e.currentTarget.dataset.name as string;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/teacher/class-detail/index?id=${id}&name=${encodeURIComponent(name)}`,
    });
  },

  onBackTap() {
    wx.navigateBack({});
  },

  onRetry() {
    this.loadRanking();
  },
});
