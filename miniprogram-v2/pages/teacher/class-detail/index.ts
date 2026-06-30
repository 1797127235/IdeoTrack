import {
  getClassDetail,
  ClassDetail,
  ClassStudentSummary,
} from '../../../services/counselorApi';

const MEMBER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'incomplete', label: '未完成' },
  { key: 'review', label: '待复核' },
  { key: 'completed', label: '已完成' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function resolveTaskCategory(title: string): string {
  if (title.includes('学习') || title.includes('理论')) return 'study';
  if (title.includes('实践') || title.includes('活动')) return 'activity';
  if (title.includes('志愿') || title.includes('服务')) return 'volunteer';
  if (title.includes('心得')) return 'reflection';
  if (title.includes('打卡')) return 'checkin';
  return 'default';
}

Page({
  data: {
    classId: '',
    className: '',
    detail: null as ClassDetail | null,
    overview: {
      taskCount: 0,
      avgRate: '0.0',
      reviewCount: 0,
      incompleteCount: 0,
    },
    memberTab: 'all',
    memberTabs: MEMBER_TABS,
    filteredStudents: [] as ClassStudentSummary[],
    loading: true,
    error: '',
  },

  async onLoad(options: Record<string, string>) {
    const classId = options.id;
    if (!classId) {
      wx.showToast({ title: '缺少班级ID', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ classId, className: decodeURIComponent(options.name || '') });
    await this.loadDetail(classId);
  },

  async loadDetail(classId: string) {
    try {
      this.setData({ loading: true, error: '' });
      const detail = await getClassDetail(classId);

      const tasks = detail.tasks.map((t) => ({ ...t, category: resolveTaskCategory(t.title) }));
      const taskCount = tasks.length;
      const avgRate =
        taskCount > 0
          ? (tasks.reduce((sum, t) => sum + t.completion_rate, 0) / taskCount).toFixed(1)
          : '0.0';
      const reviewCount = tasks.reduce((sum, t) => sum + t.review_count, 0);
      const incompleteCount = detail.students.filter(
        (s) => s.completed_count < s.total_tasks
      ).length;

      this.setData(
        {
          detail: { ...detail, tasks },
          overview: { taskCount, avgRate, reviewCount, incompleteCount },
          loading: false,
        },
        () => this.applyMemberFilter()
      );
    } catch (err) {
      this.setData({
        error: err instanceof Error ? err.message : '加载失败',
        loading: false,
      });
    }
  },

  onBackTap() {
    wx.navigateBack();
  },

  onRetry() {
    this.loadDetail(this.data.classId);
  },

  onMemberTabChange(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;
    this.setData({ memberTab: key }, () => this.applyMemberFilter());
  },

  applyMemberFilter() {
    const { detail, memberTab } = this.data;
    if (!detail) return;

    let list = detail.students;
    if (memberTab === 'incomplete') {
      list = detail.students.filter((s) => s.completed_count < s.total_tasks);
    } else if (memberTab === 'review') {
      list = detail.students.filter((s) => s.review_count > 0);
    } else if (memberTab === 'completed') {
      list = detail.students.filter((s) => s.completed_count === s.total_tasks && s.total_tasks > 0);
    }
    this.setData({ filteredStudents: list });
  },

  onTaskTap(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/teacher/task-detail/index?id=${id}` });
  },

  onViewAllTasks() {
    wx.navigateTo({ url: '/pages/teacher/tasks/index' });
  },

  onStudentTap(e: WechatMiniprogram.TouchEvent) {
    const { id, name } = e.currentTarget.dataset;
    wx.showToast({ title: `${name || '学生'}档案开发中`, icon: 'none' });
  },

  onRemindIncomplete() {
    const { detail } = this.data;
    if (!detail || detail.tasks.length === 0) {
      wx.showToast({ title: '暂无可提醒的任务', icon: 'none' });
      return;
    }
    const ongoing = detail.tasks
      .filter((t) => new Date(t.deadline_at) > new Date())
      .map((t) => ({ task_id: t.task_id, title: t.title }));
    if (ongoing.length === 0) {
      wx.showToast({ title: '当前没有进行中的任务', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: ongoing.map((t) => t.title),
      success: (res) => {
        const task = ongoing[res.tapIndex];
        if (task) {
          wx.navigateTo({ url: `/pages/teacher/task-detail/index?id=${task.task_id}` });
        }
      },
    });
  },

  formatDate(iso: string): string {
    return formatDate(iso);
  },
});
