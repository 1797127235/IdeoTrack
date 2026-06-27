import { getToken } from './utils/token';
import { getUserRole } from './utils/auth';

App<{
  globalData: {
    /** 是否已登录 */
    loggedIn: boolean;
    /** 当前用户角色 */
    role: 'student' | 'counselor' | 'admin' | null;
  };
}>({
  globalData: {
    loggedIn: false,
    role: null,
  },

  onLaunch() {
    // 启动时从本地缓存恢复登录态与角色
    const token = getToken();
    if (token) {
      this.globalData.loggedIn = true;
      this.globalData.role = getUserRole();
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
