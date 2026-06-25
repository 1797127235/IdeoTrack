import {
  getCounselorDashboard,
  exportCheckIns,
  type ClassDashboardItem,
} from '../../../services/counselorApi';
import { toBeijingDateString } from '../../../utils/date';

interface ClassSelectItem extends ClassDashboardItem {
  selected: boolean;
}

function uniqueClasses(tasks: { classes: ClassDashboardItem[] }[]): ClassDashboardItem[] {
  const map = new Map<string, ClassDashboardItem>();
  for (const task of tasks) {
    for (const c of task.classes) {
      if (!map.has(c.class_id)) {
        map.set(c.class_id, c);
      }
    }
  }
  return Array.from(map.values());
}

Page({
  data: {
    classes: [] as ClassSelectItem[],
    allSelected: false,
    startDate: '',
    endDate: '',
    loading: false,
    errorMsg: '',
    result: null as { download_url: string; expires_at: string } | null,
  },

  onLoad() {
    const today = toBeijingDateString();
    // 默认日期范围：最近 7 天
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    const startDate = toBeijingDateString(d);
    this.setData({ startDate, endDate: today });
    this.loadClasses();
  },

  async loadClasses() {
    try {
      const data = await getCounselorDashboard();
      const classes: ClassSelectItem[] = uniqueClasses(data.tasks).map((c) => ({
        ...c,
        selected: false,
      }));
      this.setData({ classes });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载班级列表失败',
      });
    }
  },

  onToggleClass(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.idx as number;
    const key = `classes[${idx}].selected`;
    const current = this.data.classes[idx].selected;
    this.setData({ [key]: !current } as Record<string, boolean>);
    this.setData({
      allSelected: this.data.classes.every((c) => c.selected),
    });
  },

  onSelectAll() {
    const allSelected = !this.data.allSelected;
    const classes = this.data.classes.map((c) => ({ ...c, selected: allSelected }));
    this.setData({ classes, allSelected });
  },

  onStartDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ startDate: e.detail.value as string });
  },

  onEndDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ endDate: e.detail.value as string });
  },

  async onExport() {
    const selectedIds = this.data.classes.filter((c) => c.selected).map((c) => c.class_id);
    if (selectedIds.length === 0) {
      wx.showToast({ title: '请先选择班级', icon: 'none' });
      return;
    }

    const { startDate, endDate } = this.data;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }

    this.setData({ loading: true, errorMsg: '', result: null });
    try {
      const result = await exportCheckIns({
        class_ids: selectedIds,
        start_date: startDate,
        end_date: endDate,
      });
      this.setData({ result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出失败';
      this.setData({ errorMsg: msg });
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onCopyLink() {
    const url = this.data.result?.download_url;
    if (!url) return;
    // 拼接完整 URL（使用 API 基础域名）
    const base = (getApp().globalData?.apiBaseUrl || '') as string;
    const fullUrl = `${base}${url}`;
    wx.setClipboardData({
      data: fullUrl,
      success() {
        wx.showToast({ title: '链接已复制，请在浏览器打开下载', icon: 'none', duration: 3000 });
      },
    });
  },
});
