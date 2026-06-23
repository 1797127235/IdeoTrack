import { wechatLogin } from '../../../services/authApi';
import { onLoginSuccess } from '../../../utils/auth';

Page({
  data: {
    loading: false,
    errorMsg: '',
  },

  /** 微信一键登录 */
  async handleWechatLogin() {
    if (this.data.loading) return;

    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await wechatLogin();

      if (res.needBind) {
        // 需要绑定学号 → 跳转绑定页，透传后端返回的 openid
        const openid = res.openid || '';
        wx.navigateTo({
          url: `/pages/auth/bind/index?openid=${encodeURIComponent(openid)}`,
        });
        this.setData({ loading: false });
        return;
      }

      // 已绑定 → 直接登录成功
      if (res.token) {
        onLoginSuccess(res.token, res.user);
        wx.reLaunch({ url: '/pages/home/index' });
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
});
