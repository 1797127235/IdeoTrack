import { getCounselorClasses, getCounselorDashboard, CounselorClass } from '../../../services/counselorApi';
import { getPendingReviews } from '../../../services/reviewApi';
import { getRole } from '../../../utils/token';

const COLORS = ['green', 'blue', 'purple'];
const ICONS = ['desktop', 'laptop', 'code'];

interface ClassView {
  id: string;
  name: string;
  studentCount: number;
  completedCount: number;
  reviewCount: number;
  completionRate: string;
  color: string;
  icon: string;
}

Page({
  data: {
    summary: {
      classCount: 0,
      studentCount: 0,
      averageRate: '0',
    },
    classes: [] as ClassView[],
    tabs: [
      { key: 'classes', label: '班级', icon: 'group', active: true },
      { key: 'dashboard', label: '看板', icon: 'grid', active: false },
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
    await this.loadClassesData();
  },

  async loadClassesData() {
    try {
      const [classes, dashboard, reviews] = await Promise.all([
        getCounselorClasses(),
        getCounselorDashboard(),
        getPendingReviews(1, 1000).catch(() => ({ items: [], total: 0, page: 1, limit: 1000 })),
      ]);

      // 聚合每个班级的打卡数据
      const statsMap = new Map<string, { totalStudents: number; checked: number; possible: number }>();
      for (const task of dashboard.tasks) {
        for (const cls of task.classes) {
          const current = statsMap.get(cls.class_id) || {
            totalStudents: cls.total_students,
            checked: 0,
            possible: 0,
          };
          current.totalStudents = Math.max(current.totalStudents, cls.total_students);
          current.checked += cls.checked_in_count;
          current.possible += cls.total_students;
          statsMap.set(cls.class_id, current);
        }
      }

      // 每个班级待复核数量
      const reviewMap = new Map<string, number>();
      for (const item of reviews.items) {
        reviewMap.set(item.class_id, (reviewMap.get(item.class_id) || 0) + 1);
      }

      const classViews: ClassView[] = classes.map((cls: CounselorClass, index: number) => {
        const stats = statsMap.get(cls.class_id);
        const totalStudents = stats?.totalStudents || 0;
        const completionRate = stats && stats.possible > 0
          ? Math.round((stats.checked / stats.possible) * 100)
          : 0;
        const completedCount = totalStudents > 0
          ? Math.round((totalStudents * completionRate) / 100)
          : 0;

        return {
          id: cls.class_id,
          name: cls.class_name,
          studentCount: totalStudents,
          completedCount,
          reviewCount: reviewMap.get(cls.class_id) || 0,
          completionRate: String(completionRate),
          color: COLORS[index % COLORS.length],
          icon: ICONS[index % ICONS.length],
        };
      });

      const totalStudents = classViews.reduce((sum, c) => sum + c.studentCount, 0);
      const averageRate = classViews.length > 0
        ? (classViews.reduce((sum, c) => sum + Number(c.completionRate), 0) / classViews.length).toFixed(1)
        : '0';

      this.setData({
        summary: {
          classCount: classViews.length,
          studentCount: totalStudents,
          averageRate,
        },
        classes: classViews,
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '班级数据加载失败',
        icon: 'none',
      });
    }
  },

  onNotificationTap() {
    wx.showToast({ title: '暂无新通知', icon: 'none' });
  },

  onViewClass(e: WechatMiniprogram.TouchEvent) {
    const { id, name } = e.currentTarget.dataset;
    if (!id) {
      wx.showToast({ title: '缺少班级ID', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/teacher/class-detail/index?id=${id}&name=${encodeURIComponent(name || '')}` });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'classes') {
      return;
    }

    if (key === 'dashboard') {
      wx.redirectTo({ url: '/pages/teacher/dashboard/index' });
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
