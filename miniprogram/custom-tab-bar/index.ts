import { getUserRole } from '../utils/auth';

interface TabItem {
  pagePath: string;
  text: string;
  iconKey: string;
}

const STUDENT_TABS: TabItem[] = [
  { pagePath: 'pages/tab/0/index', text: '首页', iconKey: 'home' },
  { pagePath: 'pages/tab/2/index', text: '成长', iconKey: 'stats' },
  { pagePath: 'pages/tab/4/index', text: '我的', iconKey: 'profile' },
];

const COUNSELOR_TABS: TabItem[] = [
  { pagePath: 'pages/tab/0/index', text: '看板', iconKey: 'dashboard' },
  { pagePath: 'pages/tab/2/index', text: '任务', iconKey: 'tasks' },
  { pagePath: 'pages/tab/4/index', text: '我的', iconKey: 'profile' },
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
