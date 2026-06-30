import { getMe, MeResponse  } from '../../../services/authApi';
import { getCounselorDashboard, CounselorTaskDashboard  } from '../../../services/counselorApi';
import { getPendingReviews, PendingReviewList  } from '../../../services/reviewApi';
import { getRole, clearToken } from '../../../utils/token';

Page({
  data: {
    profile: {
      name: '老师',
      roleLabel: '辅导员',
      college: '',
      staffId: '',
    },
    stats: {
      classCount: 0,
      studentCount: 0,
      pendingReviewCount: 0,
    },
    menuItems: [
      { key: 'classes', label: '我的班级', icon: 'group' },
      { key: 'records', label: '任务记录', icon: 'clipboard' },
      { key: 'reviews', label: '人工复核记录', icon: 'reviews' },
      { key: 'notifications', label: '通知设置', icon: 'bell' },
      { key: 'security', label: '账号与安全', icon: 'lock' },
      { key: 'help', label: '帮助与反馈', icon: 'help' },
      { key: 'settings', label: '设置', icon: 'settings' },
    ],
    tabs: [
      { key: 'classes', label: '班级', icon: 'group', active: false },
      { key: 'dashboard', label: '看板', icon: 'grid', active: false },
      { key: 'tasks', label: '任务', icon: 'clipboard', active: false },
      { key: 'mine', label: '我的', icon: 'user', active: true },
    ],
  },

  onLoad() {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }
    this.loadMineData();
  },

  onShow() {
    this.loadMineData();
  },

  async loadMineData() {
    try {
      const [me, dashboard, reviews] = await Promise.all([
        getMe(),
        getCounselorDashboard(),
        getPendingReviews(1, 1000).catch(() => ({ items: [], total: 0, page: 1, limit: 1000 } as PendingReviewList)),
      ]);

      this.setData({
        profile: this.buildProfile(me),
        stats: {
          classCount: me.managedClassesCount,
          studentCount: this.countStudents(dashboard),
          pendingReviewCount: reviews.total,
        },
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '我的页面加载失败',
        icon: 'none',
      });
    }
  },

  buildProfile(me: MeResponse) {
    return {
      name: me.name || me.schoolId || '老师',
      roleLabel: '辅导员',
      college: me.collegeName || '',
      staffId: me.schoolId,
    };
  },

  countStudents(dashboard: CounselorTaskDashboard): number {
    const classMap = new Map<string, number>();
    for (const task of dashboard.tasks) {
      for (const cls of task.classes) {
        classMap.set(cls.class_id, cls.total_students);
      }
    }
    let total = 0;
    for (const count of classMap.values()) {
      total += count;
    }
    return total;
  },

  onNotificationTap() {
    wx.showToast({ title: '暂无新通知', icon: 'none' });
  },

  onMenuTap(e: WechatMiniprogram.TouchEvent) {
    const { key, label } = e.currentTarget.dataset;

    if (key === 'classes') {
      wx.redirectTo({ url: '/pages/teacher/classes/index' });
      return;
    }

    if (key === 'reviews') {
      wx.navigateTo({ url: '/pages/teacher/reviews/index' });
      return;
    }

    if (key === 'records') {
      wx.navigateTo({ url: '/pages/teacher/task-records/index' });
      return;
    }

    wx.showToast({ title: `${label || '功能'}开发中`, icon: 'none' });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          clearToken();
          const app = getApp<{ globalData: { loggedIn?: boolean; role?: string | null; userInfo?: unknown } }>();
          if (app && app.globalData) {
            app.globalData.loggedIn = false;
            app.globalData.role = null;
            app.globalData.userInfo = null;
          }
          wx.redirectTo({ url: '/pages/auth/login/index' });
        }
      },
    });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'mine') {
      return;
    }

    if (key === 'classes') {
      wx.redirectTo({ url: '/pages/teacher/classes/index' });
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

    wx.showToast({ title: '页面开发中', icon: 'none' });
  },
});
