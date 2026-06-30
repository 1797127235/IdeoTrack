import { getMe, getMeStats } from '../../../services/authApi';
import { listMyTasks, StudentTask } from '../../../services/taskApi';
import { getDailyQuote, Quote } from '../../../services/quoteApi';
import { listLearningResources, LearningResource, getCoverImageUrl } from '../../../services/learningResourceApi';

function formatDate(date: Date): { dateText: string; weekday: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    dateText: `${year}年${month}月${day}日`,
    weekday: `星期${weekdays[date.getDay()]}`,
  };
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `截止 ${month}月${day}日 ${hour}:${minute}`;
}

function computeNextBadgeDays(currentStreak: number): number {
  if (currentStreak < 7) return 7 - currentStreak;
  if (currentStreak < 30) return 30 - currentStreak;
  return 0;
}

function truncate(text: string, max = 60): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

Page({
  data: {
    studentName: '同学',
    currentDate: '',
    weekday: '',
    pendingTaskCount: 0,
    streakDays: 0,
    nextBadgeDays: 0,
    taskProgress: 0,
    progressDeg: 0,
    taskStats: [
      { label: '已完成', value: 0, color: 'green' },
      { label: '未完成', value: 0, color: 'orange' },
    ],
    task: {
      title: '暂无待办任务',
      summary: '今天没有需要完成的思政学习任务，去成长页看看吧。',
      deadline: '',
      estimate: '',
      points: '',
    },
    quote: {
      content: '立德修身，知行合一。',
      author: '',
    },
    reading: {
      id: '',
      title: '《青春之间：中国青年的使命与担当》',
      subtitle: '与时代同行，做有理想、敢担当、能吃苦的新时代青年。',
      coverUrl: '',
    },
    tabs: [
      { key: 'home', label: '首页', icon: 'home', active: true },
      { key: 'task', label: '任务', icon: 'clipboard', active: false },
      { key: 'growth', label: '成长', icon: 'star', active: false },
      { key: 'mine', label: '我的', icon: 'user', active: false },
    ],
  },

  async onLoad() {
    const { dateText, weekday } = formatDate(new Date());
    this.setData({ currentDate: dateText, weekday });
    await this.loadHomeData();
  },

  async loadHomeData() {
    try {
      const [me, stats, tasksRes, quote] = await Promise.all([
        getMe(),
        getMeStats(),
        listMyTasks(1, 20),
        getDailyQuote().catch(() => null as Quote | null),
      ]);

      const resourcesRes = await listLearningResources(1, 1, 'published');
      const recommendedResource = resourcesRes.success && resourcesRes.data?.items?.length
        ? resourcesRes.data.items[0]
        : null;

      const tasks = tasksRes.success && tasksRes.data ? tasksRes.data : [];
      const pendingTasks = tasks.filter(
        (t: StudentTask) => t.status === 'in_progress' || t.status === 'overdue'
      );
      const currentTask = pendingTasks[0];

      this.setData({
        studentName: me.name || me.schoolId || '同学',
        pendingTaskCount: pendingTasks.length,
        streakDays: stats.currentStreak,
        nextBadgeDays: computeNextBadgeDays(stats.currentStreak),
        taskProgress: Math.min(100, Math.max(0, stats.monthly.completionRate)),
        progressDeg: Math.min(360, Math.round(Math.max(0, stats.monthly.completionRate) * 3.6)),
        taskStats: [
          { label: '已完成', value: stats.monthly.completedTasks, color: 'green' },
          { label: '未完成', value: Math.max(0, stats.monthly.totalTasks - stats.monthly.completedTasks), color: 'orange' },
        ],
        task: currentTask
          ? {
              title: currentTask.title,
              summary: truncate(currentTask.content),
              deadline: formatDeadline(currentTask.deadline_at),
              estimate: '预计 15 分钟',
              points: '+15 积分',
            }
          : this.data.task,
        quote: quote
          ? { content: quote.content, author: quote.author || '习近平' }
          : this.data.quote,
        reading: recommendedResource
          ? {
              id: recommendedResource.id,
              title: recommendedResource.title,
              subtitle: recommendedResource.description || '推荐阅读',
              coverUrl: getCoverImageUrl(recommendedResource) || '',
            }
          : this.data.reading,
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '首页数据加载失败',
        icon: 'none',
      });
    }
  },

  onNotificationTap() {
    wx.showToast({ title: '暂无新通知', icon: 'none' });
  },

  onViewAllTasks() {
    wx.redirectTo({ url: '/pages/student/task/index' });
  },

  onStartTask() {
    wx.showToast({ title: '进入学习任务', icon: 'none' });
  },

  onOpenReading() {
    const { reading } = this.data;
    if (!reading.id) {
      wx.showToast({ title: '暂无推荐内容', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/student/learning-resource-detail/index?id=${reading.id}` });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'home') {
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

    if (key === 'mine') {
      wx.redirectTo({ url: '/pages/student/mine/index' });
      return;
    }

    wx.showToast({ title: '页面开发中', icon: 'none' });
  },
});
