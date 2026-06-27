const { getUserRole } = require('../utils/auth');

const STUDENT_TABS = [
  { pagePath: 'pages/tab/0/index', text: '首页', iconKey: 'home' },
  { pagePath: 'pages/tab/1/index', text: '学习', iconKey: 'learn' },
  { pagePath: 'pages/tab/2/index', text: '成长', iconKey: 'stats' },
  { pagePath: 'pages/tab/4/index', text: '我的', iconKey: 'profile' },
];

const COUNSELOR_TABS = [
  { pagePath: 'pages/tab/0/index', text: '看板', iconKey: 'dashboard' },
  { pagePath: 'pages/tab/2/index', text: '任务', iconKey: 'tasks' },
  { pagePath: 'pages/tab/4/index', text: '我的', iconKey: 'profile' },
];

Component({
  data: {
    list: [],
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

    setSelectedByPath(path) {
      this.refreshTabs();
      const idx = this.data.list.findIndex(
        (item) => path === item.pagePath || path.endsWith(item.pagePath)
      );
      if (idx !== -1) {
        this.setData({ selected: idx });
      }
    },

    switchTab(e) {
      const index = Number(e.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item) {
        return;
      }
      wx.switchTab({ url: `/${item.pagePath}` });
      this.setData({ selected: index });
    },
  },
});
