import { wechatLogin, loginWithPassword } from '../../../services/authApi';
import { get } from '../../../services/api';
import { onLoginSuccess } from '../../../utils/auth';
import { getToken, clearToken } from '../../../utils/token';

function getHomeUrl(role: string | null): string {
  return '/pages/tab/0/index';
}

Page({
  data: {
    mode: 'wechat',
    loading: false,
    errorMsg: '',
    account: '',
    password: '',
  },

  async onShow() {
    // 已登录时根据 token 里的真实角色跳转，避免本地 storage 角色过期导致跳错首页
    const token = getToken();
    if (!token) return;

    try {
      const res = await get<{ userId: string; role: string }>('/api/auth/me');
      if (res.success && res.data) {
        wx.switchTab({ url: getHomeUrl(res.data.role) });
        return;
      }
    } catch {
      // token 可能已失效，清掉后停留在登录页
    }
    clearToken();
  },

  switchMode(e: WechatMiniprogram.BaseEvent) {
    const mode = e.currentTarget.dataset.mode as string;
    if (!mode || mode === this.data.mode) return;
    this.setData({ mode, errorMsg: '' });
  },

  onAccountInput(e: WechatMiniprogram.Input) {
    this.setData({ account: e.detail.value });
  },

  onPasswordInput(e: WechatMiniprogram.Input) {
    this.setData({ password: e.detail.value });
  },

  /** 微信一键登录 */
  async handleWechatLogin() {
    if (this.data.loading) return;

    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await wechatLogin();

      if (res.needBind) {
        const openid = res.openid || '';
        wx.navigateTo({
          url: `/pages/auth/bind/index?openid=${encodeURIComponent(openid)}`,
        });
        this.setData({ loading: false });
        return;
      }

      if (res.token && res.user) {
        onLoginSuccess(res.token, res.user);
        wx.switchTab({ url: getHomeUrl(res.user.role) });
        return;
      }

      this.setData({ errorMsg: '登录响应异常', loading: false });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '登录失败',
        loading: false,
      });
    }
  },

  /** 账号密码登录 */
  async handlePasswordLogin() {
    if (this.data.loading) return;

    const { account, password } = this.data;
    if (!account.trim()) {
      this.setData({ errorMsg: '请输入账号' });
      return;
    }
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await loginWithPassword(account.trim(), password);
      onLoginSuccess(res.token, res.user);
      wx.switchTab({ url: getHomeUrl(res.user.role) });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '登录失败',
        loading: false,
      });
    }
  },
});
