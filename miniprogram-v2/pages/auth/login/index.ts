import { loginWithPassword, getMe } from '../../../services/authApi';
import { setToken, setRole } from '../../../utils/token';
import { navigateByRole } from '../../../utils/navigation';

Page({
  data: {
    account: '',
    password: '',
    showPassword: false,
    agreed: false,
  },

  onAccountInput(e: WechatMiniprogram.Input) {
    this.setData({ account: e.detail.value });
  },

  onPasswordInput(e: WechatMiniprogram.Input) {
    this.setData({ password: e.detail.value });
  },

  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  async onLogin() {
    const { account, password, agreed } = this.data;

    if (!agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }

    if (!account || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...', mask: true });
    try {
      const loginRes = await loginWithPassword(account, password);
      setToken(loginRes.token);
      setRole(loginRes.user.role);

      const me = await getMe();
      setRole(me.role);

      wx.hideLoading();
      navigateByRole(me.role);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err instanceof Error ? err.message : '登录失败', icon: 'none' });
    }
  },

  onForgot() {
    wx.showToast({ title: '忘记密码开发中', icon: 'none' });
  },

  onUserAgreement() {
    wx.showToast({ title: '用户协议开发中', icon: 'none' });
  },

  onPrivacyPolicy() {
    wx.showToast({ title: '隐私政策开发中', icon: 'none' });
  },
});
