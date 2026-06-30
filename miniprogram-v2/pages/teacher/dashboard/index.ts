import {
  getCounselorClasses,
  getCounselorDashboard,
  getCheckInTrend,
  CounselorClass,
} from '../../../services/counselorApi';
import { getPendingReviews } from '../../../services/reviewApi';
import { getRole } from '../../../utils/token';

interface RankingItem {
  rank: number;
  name: string;
  rate: string;
  width: string;
  tone: string;
}

interface TrendPoint {
  date: string;
  value: string;
  left: number;
  bottom: number;
}

const WEEK_OPTIONS = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
];

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekRange(d: Date): { start: Date; end: Date } {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}



function formatTrendDate(isoDate: string): string {
  const d = new Date(isoDate);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * 将字符串按 UTF-8 编码后转为 base64。
 * 注意：小程序运行时（尤其真机）不提供全局 TextEncoder，故手动实现 UTF-8 编码。
 */
function utf8ToBase64(str: string): string {
  // 1. 手动 UTF-8 编码（避免依赖 TextEncoder）
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      // 代理对（emoji 等）合并为码点
      const low = str.charCodeAt(i + 1);
      code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
      i++;
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  // 2. base64 编码
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const idx1 = b1 >> 2;
    const idx2 = ((b1 & 0x03) << 4) | (b2 >> 4);
    const idx3 = ((b2 & 0x0f) << 2) | (b3 >> 6);
    const idx4 = b3 & 0x3f;
    result +=
      BASE64_CHARS[idx1] +
      BASE64_CHARS[idx2] +
      (i + 1 < bytes.length ? BASE64_CHARS[idx3] : '=') +
      (i + 2 < bytes.length ? BASE64_CHARS[idx4] : '=');
  }
  return result;
}

function buildTrendSvg(points: TrendPoint[]): string {
  if (points.length < 2) return '';
  const width = 700;
  const height = 300;
  const paddingX = 40;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const coords = points.map((p, i) => {
    const x = paddingX + (i / (points.length - 1)) * chartWidth;
    const y = height - paddingY - (parseFloat(p.value) / 100) * chartHeight;
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const fillPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(34,163,84,0.25)"/>
        <stop offset="100%" stop-color="rgba(34,163,84,0.02)"/>
      </linearGradient>
    </defs>
    <path d="${fillPath}" fill="url(#fillGrad)" stroke="none"/>
    <path d="${linePath}" fill="none" stroke="#16a65a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    ${coords.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="10" fill="#fff" stroke="#16a65a" stroke-width="5"/>`).join('')}
  </svg>`;

  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
}

Page({
  data: {
    filters: {
      weekKey: 'week',
      weekLabel: '本周',
      dateRange: '',
      classId: '',
      classLabel: '全部班级',
    },
    classRange: ['全部班级'] as string[],
    classIndex: 0,
    classes: [] as CounselorClass[],
    metrics: {
      checkInRate: '0',
      pendingReviews: 0,
      completionRate: '0',
    },
    trendPoints: [] as TrendPoint[],
    trendSvg: '',
    hasTrendData: false,
    ranking: [] as RankingItem[],
    tabs: [
      { key: 'classes', label: '班级', icon: 'group', active: false },
      { key: 'dashboard', label: '看板', icon: 'grid', active: true },
      { key: 'tasks', label: '任务', icon: 'clipboard', active: false },
      { key: 'mine', label: '我的', icon: 'user', active: false },
    ],
  },

  async onLoad() {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }

    this.initDefaultWeek();
    await this.loadClasses();
    await this.loadDashboard();
  },

  async onShow() {
    if (this.data.classes.length === 0) return;
    await this.loadDashboard();
  },

  initDefaultWeek() {
    const { start, end } = getWeekRange(new Date());
    this.setData({
      'filters.dateRange': `${formatDate(start)} - ${formatDate(end)}`,
    });
  },

  async loadClasses() {
    try {
      const classes = await getCounselorClasses();
      const classRange = ['全部班级', ...classes.map((c) => c.class_name)];
      this.setData({ classes, classRange });
    } catch {
      wx.showToast({ title: '班级列表加载失败', icon: 'none' });
    }
  },

  getFilterDates() {
    const { weekKey } = this.data.filters;
    const now = new Date();
    if (weekKey === 'all') return { startDate: '', endDate: '' };

    let range: { start: Date; end: Date };
    if (weekKey === 'week') range = getWeekRange(now);
    else range = getMonthRange(now);

    return {
      startDate: toISODate(range.start),
      endDate: toISODate(range.end),
    };
  },

  async loadDashboard() {
    try {
      const { classId } = this.data.filters;
      const { startDate, endDate } = this.getFilterDates();

      const [dashboard, reviews, trend] = await Promise.all([
        getCounselorDashboard(classId || undefined, startDate || undefined, endDate || undefined),
        getPendingReviews(1, 1000).catch(() => ({ items: [], total: 0, page: 1, limit: 1000 })),
        getCheckInTrend(7, classId || undefined).catch(() => ({ days: 7, items: [] })),
      ]);

      const classMap = new Map<string, { name: string; checked: number; possible: number }>();
      for (const task of dashboard.tasks) {
        for (const cls of task.classes) {
          const current = classMap.get(cls.class_id) || {
            name: cls.class_name,
            checked: 0,
            possible: 0,
          };
          current.checked += cls.checked_in_count;
          current.possible += cls.total_students;
          classMap.set(cls.class_id, current);
        }
      }

      const classRates = Array.from(classMap.values()).map((item) => {
        const rate = item.possible > 0 ? (item.checked / item.possible) * 100 : 0;
        return { name: item.name, rate };
      });

      const totalChecked = Array.from(classMap.values()).reduce((sum, item) => sum + item.checked, 0);
      const totalPossible = Array.from(classMap.values()).reduce((sum, item) => sum + item.possible, 0);
      const completionRate = totalPossible > 0 ? ((totalChecked / totalPossible) * 100).toFixed(1) : '0';

      const ranking = classRates
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5)
        .map((item, index) => ({
          rank: index + 1,
          name: item.name,
          rate: item.rate.toFixed(1),
          width: `${Math.max(8, Math.min(100, item.rate))}%`,
          tone: index < 3 ? ['orange', 'gold', 'blue'][index] : 'gray',
        }));

      const pendingReviews = classId
        ? reviews.items.filter((r) => r.class_id === classId).length
        : reviews.total;

      const trendItems = trend.items || [];
      const trendPoints: TrendPoint[] = trendItems.map((item, index, list) => ({
        date: formatTrendDate(item.date),
        value: item.rate.toFixed(1),
        left: list.length > 1 ? (index / (list.length - 1)) * 84 + 8 : 50,
        bottom: Math.max(8, (item.rate / 100) * 72 + 8),
      }));

      this.setData({
        metrics: {
          checkInRate: completionRate,
          pendingReviews,
          completionRate,
        },
        ranking,
        trendPoints,
        trendSvg: buildTrendSvg(trendPoints),
        hasTrendData: trendPoints.length > 0,
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '看板数据加载失败',
        icon: 'none',
      });
    }
  },

  onWeekFilterTap() {
    wx.showActionSheet({
      itemList: WEEK_OPTIONS.map((o) => o.label),
      success: (res) => {
        const option = WEEK_OPTIONS[res.tapIndex];
        if (!option) return;

        const { start, end } = this.getRangeByKey(option.key);
        this.setData(
          {
            'filters.weekKey': option.key,
            'filters.weekLabel': option.label,
            'filters.dateRange': option.key === 'all' ? '全部时间' : `${formatDate(start)} - ${formatDate(end)}`,
          },
          () => this.loadDashboard()
        );
      },
    });
  },

  getRangeByKey(key: string): { start: Date; end: Date } {
    const now = new Date();
    if (key === 'week') return getWeekRange(now);
    if (key === 'month') return getMonthRange(now);
    return { start: new Date('1970-01-01'), end: now };
  },

  onClassPickerChange(e: WechatMiniprogram.PickerChange) {
    const index = Number(e.detail.value);
    const { classes } = this.data;
    if (index === 0) {
      this.setData(
        {
          'filters.classId': '',
          'filters.classLabel': '全部班级',
          classIndex: 0,
        },
        () => this.loadDashboard()
      );
      return;
    }
    const cls = classes[index - 1];
    if (cls) {
      this.setData(
        {
          'filters.classId': cls.class_id,
          'filters.classLabel': cls.class_name,
          classIndex: index,
        },
        () => this.loadDashboard()
      );
    }
  },

  onPendingTap() {
    wx.navigateTo({ url: '/pages/teacher/reviews/index' });
  },

  onViewRanking() {
    wx.navigateTo({ url: '/pages/teacher/class-ranking/index' });
  },

  onExportTap() {
    wx.navigateTo({ url: '/pages/teacher/report-export/index' });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'dashboard') {
      return;
    }

    if (key === 'classes') {
      wx.redirectTo({ url: '/pages/teacher/classes/index' });
      return;
    }

    if (key === 'tasks') {
      wx.redirectTo({ url: '/pages/teacher/tasks/index' });
      return;
    }

    if (key === 'mine') {
      wx.redirectTo({ url: '/pages/teacher/mine/index' });
      return;
    }

    wx.showToast({ title: '页面开发中', icon: 'none' });
  },
});
