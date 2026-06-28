import {
  createTaskFromTemplate,
  fetchTaskTemplates,
  getCounselorClasses,
  type TaskTemplate,
  type CounselorClass,
} from '../../../services/taskApi';
import { formatDeadline } from '../../../utils/format';

interface ClassSelectItem extends CounselorClass {
  selected: boolean;
}

interface TemplateView extends TaskTemplate {
  deadlineText: string;
}

Page({
  data: {
    templates: [] as TemplateView[],
    selectedTemplate: null as TemplateView | null,
    classes: [] as ClassSelectItem[],
    allSelected: false,
    selectedCount: 0,
    publishedAt: '',
    deadlineAt: '',
    loading: false,
    submitting: false,
    error: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    this.loadTemplates();
    this.loadClasses();
    this.initDates();

    if (query.taskId) {
      this.preselectTemplate(query.taskId);
    }
  },

  initDates() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.setData({
      publishedAt: this.formatDateTimeLocal(now),
      deadlineAt: this.formatDateTimeLocal(tomorrow),
    });
  },

  formatDateTimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  async loadTemplates() {
    this.setData({ loading: true });
    try {
      const res = await fetchTaskTemplates();
      if (res.success && res.data) {
        const templates = res.data.items.map<TemplateView>((t) => ({
          ...t,
          deadlineText: formatDeadline(t.updated_at),
        }));
        this.setData({ templates });
      }
    } catch (err) {
      console.error('加载模板库失败:', err);
      this.setData({ error: '加载模板库失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadClasses() {
    try {
      const res = await getCounselorClasses();
      if (res.success && res.data) {
        const classes: ClassSelectItem[] = res.data.map((c) => ({ ...c, selected: false }));
        this.setData({ classes });
      } else {
        this.setData({ error: res.error?.message || '加载班级失败' });
      }
    } catch (err) {
      console.error('加载班级失败:', err);
      this.setData({ error: '加载班级失败' });
    }
  },

  preselectTemplate(templateId: string) {
    const templates = this.data.templates;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      this.setData({ selectedTemplate: template });
    }
  },

  selectTemplate(e: WechatMiniprogram.TouchEvent) {
    const templateId = e.currentTarget.dataset.id as string;
    const template = this.data.templates.find((t) => t.id === templateId) || null;
    this.setData({ selectedTemplate: template });
  },

  toggleClass(e: WechatMiniprogram.TouchEvent) {
    const idx = e.currentTarget.dataset.idx as number;
    const key = `classes[${idx}].selected`;
    const current = this.data.classes[idx].selected;
    this.setData({ [key]: !current } as Record<string, boolean>);
    const selectedCount = this.data.classes.filter((c) => c.selected).length;
    this.setData({
      allSelected: selectedCount === this.data.classes.length,
      selectedCount,
    });
  },

  toggleSelectAll() {
    const allSelected = !this.data.allSelected;
    const classes = this.data.classes.map((c) => ({ ...c, selected: allSelected }));
    this.setData({
      classes,
      allSelected,
      selectedCount: allSelected ? classes.length : 0,
    });
  },

  onPublishedAtChange(e: WechatMiniprogram.TouchEvent) {
    this.setData({ publishedAt: e.detail.value });
  },

  onDeadlineAtChange(e: WechatMiniprogram.TouchEvent) {
    this.setData({ deadlineAt: e.detail.value });
  },

  async submitDispatch() {
    const { selectedTemplate, classes, publishedAt, deadlineAt } = this.data;
    const selectedClassIds = classes.filter((c) => c.selected).map((c) => c.class_id);

    if (!selectedTemplate) {
      wx.showToast({ title: '请选择模板', icon: 'none' });
      return;
    }

    if (selectedClassIds.length === 0) {
      wx.showToast({ title: '请选择班级', icon: 'none' });
      return;
    }

    if (!publishedAt || !deadlineAt) {
      wx.showToast({ title: '请设置发布时间', icon: 'none' });
      return;
    }

    if (new Date(deadlineAt) <= new Date(publishedAt)) {
      wx.showToast({ title: '截止时间必须晚于发布时间', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await createTaskFromTemplate({
        template_id: selectedTemplate.id,
        scope_type: 'class',
        target_class_ids: selectedClassIds,
        published_at: new Date(publishedAt).toISOString(),
        deadline_at: new Date(deadlineAt).toISOString(),
      });
      if (!res.success) {
        throw new Error(res.error?.message || '发布失败');
      }
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('发布任务失败:', err);
      wx.showToast({ title: err instanceof Error ? err.message : '发布失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
