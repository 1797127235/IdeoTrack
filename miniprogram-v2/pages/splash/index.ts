import { getToken } from '../../utils/token';
import { getMe } from '../../services/authApi';
import { setRole } from '../../utils/token';
import { navigateByRole } from '../../utils/navigation';

Page({
  data: {
    progress: 0,
  },

  timer: null as number | null,
  navigateTimer: null as number | null,

  async onLoad() {
    const token = getToken();
    if (token) {
      try {
        const me = await getMe();
        setRole(me.role);
        this.navigateByRole(me.role);
        return;
      } catch {
        // token 失效，继续走登录流程
      }
    }
    this.startProgress();
  },

  onUnload() {
    this.clearTimers();
  },

  startProgress() {
    const duration = 2500;
    const interval = 50;
    const step = 100 / (duration / interval);

    this.timer = setInterval(() => {
      const next = Math.min(this.data.progress + step, 95);
      this.setData({ progress: next });
    }, interval);

    this.navigateTimer = setTimeout(() => {
      this.setData({ progress: 100 });
      this.navigateToLogin();
    }, duration);
  },

  onSkip() {
    this.clearTimers();
    this.setData({ progress: 100 });
    this.navigateToLogin();
  },

  navigateToLogin() {
    wx.redirectTo({ url: '/pages/auth/login/index' });
  },

  navigateByRole(role?: string | null) {
    navigateByRole(role);
  },

  clearTimers() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.navigateTimer) {
      clearTimeout(this.navigateTimer);
      this.navigateTimer = null;
    }
  },
});
