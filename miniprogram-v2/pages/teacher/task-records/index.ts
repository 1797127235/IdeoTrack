import { listTasks, TaskWithStats } from '../../../services/taskApi';
import { getCounselorClasses } from '../../../services/counselorApi';
import { getPendingReviews, PendingReviewItem } from '../../../services/reviewApi';
import { getRole } from '../../../utils/token';

type RecordFilter = 'all' | 'ongoing' | 'ended' | 'review';
type RecordStatus = 'ongoing' | 'ended';
type CategoryType = 'study' | 'checkin';

interface TaskRecordView {
  id: string;
  title: string;
  category: string;
  categoryType: CategoryType;
  status: RecordStatus;
  statusLabel: string;
  targetText: string;
  period: string;
  publishedText: string;
  deadlineText: string;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  reviewCount: number;
  rawIds: string[];
}

const PAGE_SIZE = 100;

function formatDateTime(iso: string): string {
  if (!iso) return '暂无';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '暂无';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}`;
}

function formatDate(iso: string): string {
  const text = formatDateTime(iso);
  return text === '暂无' ? text : text.slice(0, 10);
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

Page({
  data: {
    loading: true,
    activeFilter: 'all' as RecordFilter,
    filters: [
      { key: 'all', label: '全部' },
      { key: 'ongoing', label: '进行中' },
      { key: 'ended', label: '已结束' },
      { key: 'review', label: '待复核' },
    ],
    summary: {
      total: 0,
      ongoing: 0,
      ended: 0,
      reviews: 0,
    },
    records: [] as TaskRecordView[],
    visibleRecords: [] as TaskRecordView[],
  },

  onLoad() {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.loadRecords().finally(() => wx.stopPullDownRefresh());
  },

  async loadRecords() {
    this.setData({ loading: true });
    try {
      const [taskResult, classes, reviews] = await Promise.all([
        listTasks(1, PAGE_SIZE),
        getCounselorClasses(),
        getPendingReviews(1, 1000).catch(() => ({ items: [] as PendingReviewItem[], total: 0, page: 1, limit: 1000 })),
      ]);

      const classMap = new Map<string, string>();
      classes.forEach((cls) => classMap.set(cls.class_id, cls.class_name));

      const records = this.buildRecords(taskResult.items, classMap, reviews.items);
      const summary = {
        total: records.length,
        ongoing: records.filter((item) => item.status === 'ongoing').length,
        ended: records.filter((item) => item.status === 'ended').length,
        reviews: records.reduce((sum, item) => sum + item.reviewCount, 0),
      };

      this.setData(
        {
          records,
          summary,
          loading: false,
        },
        () => this.applyFilter(this.data.activeFilter)
      );
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({
        title: err instanceof Error ? err.message : '任务记录加载失败',
        icon: 'none',
      });
    }
  },

  buildRecords(
    tasks: TaskWithStats[],
    classMap: Map<string, string>,
    reviews: PendingReviewItem[]
  ): TaskRecordView[] {
    const now = new Date();
    const grouped = new Map<string, TaskRecordView>();

    tasks.forEach((task) => {
      const groupKey = `${task.title}|${task.published_at}|${task.deadline_at}`;
      const targetName = this.resolveTargetName(task, classMap);
      const categoryType = this.resolveCategoryType(task);
      const deadline = new Date(task.deadline_at);
      const status: RecordStatus = task.status === 'published' && deadline > now ? 'ongoing' : 'ended';
      const existing = grouped.get(groupKey);

      if (!existing) {
        grouped.set(groupKey, {
          id: task.id,
          title: task.title,
          category: categoryType === 'checkin' ? '打卡任务' : '学习任务',
          categoryType,
          status,
          statusLabel: status === 'ongoing' ? '进行中' : '已结束',
          targetText: targetName,
          period: `${formatDate(task.published_at)} - ${formatDate(task.deadline_at)}`,
          publishedText: formatDateTime(task.published_at),
          deadlineText: formatDateTime(task.deadline_at),
          completedCount: task.completed_count,
          totalCount: task.total_assignees,
          completionRate: clampRate(task.completion_rate),
          reviewCount: 0,
          rawIds: [task.id],
        });
        return;
      }

      if (targetName && !existing.targetText.split('、').includes(targetName)) {
        existing.targetText = `${existing.targetText}、${targetName}`;
      }
      existing.completedCount += task.completed_count;
      existing.totalCount += task.total_assignees;
      existing.rawIds.push(task.id);
      if (status === 'ongoing') {
        existing.status = 'ongoing';
        existing.statusLabel = '进行中';
      }
    });

    const records = Array.from(grouped.values());
    records.forEach((record) => {
      record.completionRate = record.totalCount > 0
        ? clampRate((record.completedCount / record.totalCount) * 100)
        : 0;
      record.reviewCount = reviews.filter((item) => record.rawIds.includes(item.task_id)).length;
    });

    return records.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'ongoing' ? -1 : 1;
      return b.deadlineText.localeCompare(a.deadlineText);
    });
  },

  resolveTargetName(task: TaskWithStats, classMap: Map<string, string>): string {
    if (task.scope_type === 'class' && task.target_class_id) {
      return classMap.get(task.target_class_id) || '班级任务';
    }
    if (task.scope_type === 'college') {
      return task.scope_label || '学院任务';
    }
    return task.scope_label || '全校';
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

  applyFilter(filter: RecordFilter) {
    let visibleRecords = this.data.records;
    if (filter === 'ongoing') {
      visibleRecords = this.data.records.filter((item) => item.status === 'ongoing');
    } else if (filter === 'ended') {
      visibleRecords = this.data.records.filter((item) => item.status === 'ended');
    } else if (filter === 'review') {
      visibleRecords = this.data.records.filter((item) => item.reviewCount > 0);
    }
    this.setData({ activeFilter: filter, visibleRecords });
  },

  onFilterTap(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as RecordFilter;
    this.applyFilter(key);
  },

  onBackTap() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/teacher/mine/index' }) });
  },

  onCreateTask() {
    wx.navigateTo({ url: '/pages/teacher/task-publish/index' });
  },

  onRecordTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    if (!id) return;
    wx.navigateTo({ url: `/pages/teacher/task-detail/index?id=${id}` });
  },

  onReviewTap() {
    wx.navigateTo({ url: '/pages/teacher/reviews/index' });
  },
});
