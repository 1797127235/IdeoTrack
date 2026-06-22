import { getToken } from './utils/token';

interface AppData {
  /** 是否已登录 */
  loggedIn: boolean;
  /** 当前用户角色（学生端固定为 student，预留） */
  role: 'student' | null;
}

App<{
  globalData: AppData;
}>({
  globalData: {
    loggedIn: false,
    role: null,
  },

  onLaunch() {
    // 启动时检查登录状态
    const token = getToken();
    if (token) {
      this.globalData.loggedIn = true;
      this.globalData.role = 'student';
    }

    // 捕获未处理的 Promise rejection
    wx.onUnhandledRejection((res) => {
      console.error('[unhandledRejection]', res.reason);
    });

    wx.onError((err) => {
      console.error('[error]', err);
    });
  },
});
