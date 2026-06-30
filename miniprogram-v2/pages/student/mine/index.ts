import { getMe, getMeStats } from '../../../services/authApi';
import { clearToken } from '../../../utils/token';

Page({
  data: {
    student: {
      name: '同学',
      role: '思想成长者',
      college: '',
      grade: '',
      level: 'Lv.1',
    },
    overview: [
      { key: 'checkin', label: '累计打卡', value: '0', unit: '天', icon: 'calendar' },
      { key: 'points', label: '累计积分', value: '0', unit: '', icon: 'medal' },
      { key: 'duration', label: '学习时长', value: '0', unit: '小时', icon: 'clock' },
    ],
    goal: {
      progress: 0,
      target: 5,
      finished: 0,
    },
    menuItems: [
      { key: 'tasks', label: '我的任务', icon: 'task', color: 'green' },
      { key: 'report', label: '学习报告', icon: 'report', color: 'blue' },
      { key: 'favorites', label: '我的收藏', icon: 'star', color: 'orange' },
      { key: 'achievements', label: '成长成就', icon: 'badge', color: 'green' },
      { key: 'notifications', label: '消息通知', icon: 'bell', color: 'purple' },
      { key: 'help', label: '帮助与反馈', icon: 'help', color: 'blue' },
      { key: 'settings', label: '设置', icon: 'settings', color: 'gray' },
    ],
    tabs: [
      { key: 'home', label: '首页', icon: 'home', active: false },
      { key: 'task', label: '任务', icon: 'clipboard', active: false },
      { key: 'growth', label: '成长', icon: 'star', active: false },
      { key: 'mine', label: '我的', icon: 'user', active: true },
    ],
  },

  async onLoad() {
    await this.loadMineData();
  },

  async loadMineData() {
    try {
      const [me, stats] = await Promise.all([getMe(), getMeStats()]);

      const weeklyGoal = 5;
      const finished = Math.min(stats.monthly.completedTasks, weeklyGoal);
      const progress = weeklyGoal > 0 ? Math.round((finished / weeklyGoal) * 100) : 0;
      // 粗略估算学习时长：按每次 15 分钟
      const durationHours = Math.round((stats.totalApproved * 15 / 60) * 10) / 10;

      this.setData({
        student: {
          name: me.name || me.schoolId || '同学',
          role: stats.level.title,
          college: me.collegeName || '',
          grade: '',
          level: `Lv.${stats.level.level}`,
        },
        overview: [
          { key: 'checkin', label: '累计打卡', value: String(stats.totalApproved), unit: '天', icon: 'calendar' },
          { key: 'points', label: '累计积分', value: String(stats.points), unit: '', icon: 'medal' },
          { key: 'duration', label: '学习时长', value: String(durationHours), unit: '小时', icon: 'clock' },
        ],
        goal: {
          progress,
          target: weeklyGoal,
          finished,
        },
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '我的页面加载失败',
        icon: 'none',
      });
    }
  },

  onSettingsTap() {
    wx.showToast({ title: '设置开发中', icon: 'none' });
  },

  onMenuTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'achievements') {
      wx.redirectTo({ url: '/pages/student/growth/index' });
      return;
    }

    wx.showToast({ title: '功能开发中', icon: 'none' });
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

    if (key === 'home') {
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }

    if (key === 'task') {
      wx.redirectTo({ url: '/pages/student/task/index' });
      return;
    }

    if (key === 'growth') {
      wx.redirectTo({ url: '/pages/student/growth/index' });
      return;
    }

    wx.showToast({ title: '页面开发中', icon: 'none' });
  },
});
