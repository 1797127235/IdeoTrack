import { listTasks, TaskWithStats  } from '../../../services/taskApi';
import { getCounselorClasses, CounselorClass  } from '../../../services/counselorApi';
import { getPendingReviews, PendingReviewItem  } from '../../../services/reviewApi';
import { getRole } from '../../../utils/token';

type TaskStatusFilter = 'all' | 'ongoing' | 'ended' | 'draft';
type TaskViewStatus = 'ongoing' | 'ended' | 'draft';
type CategoryType = 'study' | 'checkin';

interface TaskView {
  id: string;
  title: string;
  category: string;
  categoryType: CategoryType;
  targetClasses: string[];
  period: string;
  status: TaskViewStatus;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  reviewCount: number;
  rawIds: string[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

Page({
  data: {
    loading: true,
    activeFilter: 'ongoing' as TaskStatusFilter,
    filters: [
      { key: 'all', label: '全部' },
      { key: 'ongoing', label: '进行中' },
      { key: 'ended', label: '已结束' },
      { key: 'draft', label: '草稿' },
    ],
    tasks: [] as TaskView[],
    drafts: [] as TaskView[],
    filteredTasks: [] as TaskView[],
    tabs: [
      { key: 'classes', label: '班级', icon: 'group', active: false },
      { key: 'dashboard', label: '看板', icon: 'grid', active: false },
      { key: 'tasks', label: '任务', icon: 'clipboard', active: true },
      { key: 'mine', label: '我的', icon: 'user', active: false },
    ],
  },

  onLoad() {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }
    this.loadTasks();
  },

  onShow() {
    this.loadTasks();
  },

  onPullDownRefresh() {
    this.loadTasks().finally(() => wx.stopPullDownRefresh());
  },

  async loadTasks() {
    this.setData({ loading: true });
    try {
      const [taskResult, classes, reviews] = await Promise.all([
        listTasks(1, 50),
        getCounselorClasses(),
        getPendingReviews(1, 1000).catch(() => ({ items: [] as PendingReviewItem[], total: 0, page: 1, limit: 1000 })),
      ]);

      const classMap = new Map<string, string>();
      for (const cls of classes) {
        classMap.set(cls.class_id, cls.class_name);
      }

      const now = new Date();
      const groups = this.groupTasks(taskResult.items, classMap, reviews.items, now);

      // 草稿目前无后端接口，保留本地空列表以待后续接入
      const drafts: TaskView[] = [];

      this.setData(
        {
          tasks: groups,
          drafts,
          loading: false,
        },
        () => {
          this.applyFilter(this.data.activeFilter);
        }
      );
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({
        title: err instanceof Error ? err.message : '任务数据加载失败',
        icon: 'none',
      });
    }
  },

  groupTasks(
    items: TaskWithStats[],
    classMap: Map<string, string>,
    reviews: PendingReviewItem[],
    now: Date
  ): TaskView[] {
    const map = new Map<string, TaskView>();

    for (const task of items) {
      const key = task.title;
      const existing = map.get(key);
      const deadline = new Date(task.deadline_at);
      const isOngoing = task.status === 'published' && deadline > now;
      const targetName = this.resolveTargetName(task, classMap);

      if (!existing) {
        const categoryType = this.resolveCategoryType(task);
        map.set(key, {
          id: task.id,
          title: task.title,
          category: categoryType === 'checkin' ? '打卡任务' : '学习任务',
          categoryType,
          targetClasses: targetName ? [targetName] : [],
          period: `${formatDate(task.published_at)} - ${formatDate(task.deadline_at)}`,
          status: isOngoing ? 'ongoing' : 'ended',
          completedCount: task.completed_count,
          totalCount: task.total_assignees,
          completionRate: task.completion_rate,
          reviewCount: 0,
          rawIds: [task.id],
        });
      } else {
        if (targetName && !existing.targetClasses.includes(targetName)) {
          existing.targetClasses.push(targetName);
        }
        if (isOngoing) {
          existing.status = 'ongoing';
        }
        existing.completedCount += task.completed_count;
        existing.totalCount += task.total_assignees;
        existing.rawIds.push(task.id);
      }
    }

    const result = Array.from(map.values());
    for (const item of result) {
      item.completionRate = item.totalCount > 0
        ? Math.round((item.completedCount / item.totalCount) * 1000) / 10
        : 0;
      item.reviewCount = reviews.filter((r) => item.rawIds.includes(r.task_id)).length;
    }

    // 进行中的任务排在前面
    return result.sort((a, b) => (b.status === 'ongoing' ? 1 : 0) - (a.status === 'ongoing' ? 1 : 0));
  },

  resolveTargetName(task: TaskWithStats, classMap: Map<string, string>): string {
    if (task.scope_type === 'class' && task.target_class_id) {
      return classMap.get(task.target_class_id) || '班级任务';
    }
    if (task.scope_type === 'college') {
      return '学院任务';
    }
    return '全校';
  },

  resolveCategoryType(task: TaskWithStats): CategoryType {
    if (
      task.title.includes('打卡') ||
      task.checkin_type === 'image' ||
      task.checkin_type === 'video' ||
      task.checkin_type === 'mixed'
    ) {
      return 'checkin';
    }
    return 'study';
  },

  applyFilter(filter: TaskStatusFilter) {
    const { tasks, drafts } = this.data;
    let list: TaskView[] = [];
    if (filter === 'all') {
      list = [...tasks, ...drafts];
    } else if (filter === 'draft') {
      list = drafts;
    } else {
      list = tasks.filter((t) => t.status === filter);
    }
    this.setData({ filteredTasks: list, activeFilter: filter });
  },

  onFilterTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;
    this.applyFilter(key as TaskStatusFilter);
  },

  onCreateTask() {
    wx.navigateTo({ url: '/pages/teacher/task-publish/index' });
  },

  onUseTemplate() {
    wx.navigateTo({ url: '/pages/teacher/task-publish-from-template/index' });
  },

  onViewDetail(e: WechatMiniprogram.TouchEvent) {
    const { id, title } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/teacher/task-detail/index?id=${id}&title=${encodeURIComponent(title || '')}` });
  },

  onReview(e: WechatMiniprogram.TouchEvent) {
    const { id, title } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/teacher/reviews/index?task_id=${id}&task_title=${encodeURIComponent(title || '')}` });
  },

  onContinueEdit(e: WechatMiniprogram.TouchEvent) {
    const { id, title } = e.currentTarget.dataset;
    wx.showToast({ title: `${title || '任务'}编辑开发中`, icon: 'none' });
  },

  onNotificationTap() {
    wx.showToast({ title: '暂无新通知', icon: 'none' });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;
    if (key === 'tasks') return;
    if (key === 'classes') {
      wx.redirectTo({ url: '/pages/teacher/classes/index' });
      return;
    }
    if (key === 'dashboard') {
      wx.redirectTo({ url: '/pages/teacher/dashboard/index' });
      return;
    }
    if (key === 'mine') {
      wx.redirectTo({ url: '/pages/teacher/mine/index' });
      return;
    }
    wx.showToast({ title: '页面开发中', icon: 'none' });
  },
});
