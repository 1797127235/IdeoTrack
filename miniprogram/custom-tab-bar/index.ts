import { getUserRole } from '../utils/auth';

interface TabItem {
  pagePath: string;
  text: string;
  icon: string;
}

const STUDENT_TABS: TabItem[] = [
  { pagePath: 'pages/home/index', text: '首页', icon: '🏠' },
  { pagePath: 'pages/leaderboard/index', text: '排行', icon: '🏆' },
  { pagePath: 'pages/calendar/index', text: '日历', icon: '📅' },
  { pagePath: 'pages/profile/index', text: '我的', icon: '👤' },
];

const COUNSELOR_TABS: TabItem[] = [
  { pagePath: 'pages/counselor/dashboard/index', text: '班级', icon: '📊' },
  { pagePath: 'pages/review/index', text: '复核', icon: '📝' },
  { pagePath: 'pages/profile/index', text: '我的', icon: '👤' },
];

Component({
  data: {
    list: [] as TabItem[],
    selected: 0,
  },

  lifetimes: {
    attached() {
      this.refreshTabs();
    },
  },

  methods: {
    refreshTabs() {
      const role = getUserRole();
      const list = role === 'counselor' ? COUNSELOR_TABS : STUDENT_TABS;
      this.setData({ list });
    },

    setSelectedByPath(path: string) {
      this.refreshTabs();
      const idx = this.data.list.findIndex(
        (item) => path === item.pagePath || path.endsWith(item.pagePath)
      );
      if (idx !== -1) {
        this.setData({ selected: idx });
      }
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number;
      const url = this.data.list[index].pagePath;
      wx.switchTab({ url: `/${url}` });
      this.setData({ selected: index });
    },
  },
});
