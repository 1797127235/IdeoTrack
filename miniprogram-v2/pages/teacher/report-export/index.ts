import {
  CounselorClass,
  exportReport,
  getCounselorClasses,
  ReportExportInput,
} from '../../../services/counselorApi';
import { getApiBaseUrl } from '../../../services/api';

interface PageData {
  form: {
    period: 'week' | 'month' | 'custom';
    startDate: string;
    endDate: string;
    classId: string;
    classLabel: string;
    reportType: 'summary' | 'class' | 'student';
    format: 'pdf' | 'excel';
  };
  classes: CounselorClass[];
  submitting: boolean;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

Page({
  data: {
    form: {
      period: 'week',
      startDate: '',
      endDate: '',
      classId: '',
      classLabel: '全部班级',
      reportType: 'summary',
      format: 'pdf',
    },
    classes: [],
    submitting: false,
  } as PageData,

  async onLoad() {
    const today = new Date();
    const start = getWeekStart(today);
    this.setData({
      'form.startDate': formatDate(start),
      'form.endDate': formatDate(today),
    });
    try {
      const classes = await getCounselorClasses();
      this.setData({ classes });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载班级失败';
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  updatePeriodDates(period: 'week' | 'month' | 'custom') {
    const today = new Date();
    let start = today;
    if (period === 'week') {
      start = getWeekStart(today);
    } else if (period === 'month') {
      start = getMonthStart(today);
    } else {
      return;
    }
    this.setData({
      'form.startDate': formatDate(start),
      'form.endDate': formatDate(today),
    });
  },

  onPeriodTap(e: WechatMiniprogram.TouchEvent) {
    const period = e.currentTarget.dataset.period as PageData['form']['period'];
    this.setData({ 'form.period': period });
    this.updatePeriodDates(period);
  },

  onStartDateChange(e: { detail: { value: string } }) {
    this.setData({ 'form.startDate': e.detail.value });
  },

  onEndDateChange(e: { detail: { value: string } }) {
    this.setData({ 'form.endDate': e.detail.value });
  },

  onClassTap() {
    const labels = ['全部班级', ...this.data.classes.map((c) => `${c.class_name}（${c.college_name}）`)];
    wx.showActionSheet({
      itemList: labels,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ 'form.classId': '', 'form.classLabel': '全部班级' });
        } else {
          const cls = this.data.classes[res.tapIndex - 1];
          this.setData({
            'form.classId': cls.class_id,
            'form.classLabel': `${cls.class_name}（${cls.college_name}）`,
          });
        }
      },
    });
  },

  onReportTypeTap(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as PageData['form']['reportType'];
    this.setData({ 'form.reportType': type });
  },

  onFormatTap(e: WechatMiniprogram.TouchEvent) {
    const format = e.currentTarget.dataset.format as PageData['form']['format'];
    this.setData({ 'form.format': format });
  },

  validate(): string | null {
    const { form } = this.data;
    if (form.period === 'custom') {
      if (!form.startDate || !form.endDate) {
        return '请选择自定义时间范围';
      }
      if (form.startDate > form.endDate) {
        return '开始日期不能晚于结束日期';
      }
    }
    return null;
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const error = this.validate();
    if (error) {
      wx.showToast({ title: error, icon: 'none' });
      return;
    }

    const { form } = this.data;
    const input: ReportExportInput = {
      period: form.period,
      report_type: form.reportType,
      format: form.format,
      class_id: form.classId || null,
    };
    if (form.period === 'custom') {
      input.start_date = form.startDate;
      input.end_date = form.endDate;
    }

    this.setData({ submitting: true });
    try {
      const { download_url } = await exportReport(input);
      wx.downloadFile({
        url: `${getApiBaseUrl()}${download_url}`,
        success: (res) => {
          if (res.statusCode !== 200) {
            wx.showToast({ title: '文件下载失败', icon: 'none' });
            return;
          }
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: form.format === 'pdf' ? 'pdf' : 'xlsx',
            showMenu: true,
          });
        },
        fail: () => wx.showToast({ title: '文件下载失败', icon: 'none' }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onBackTap() {
    wx.navigateBack({});
  },
});
