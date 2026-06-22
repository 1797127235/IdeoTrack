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
        // 需要绑定学号 → 跳转绑定页
        // openid 由后端在 login 响应里返回，前端透传给绑定页
        // （后端 Story 12.3 实现时会在 needBind 时附带 openid）
        wx.navigateTo({
          url: `/pages/auth/bind/index?openid=${encodeURIComponent(res.token || '')}`,
        });
        this.setData({ loading: false });
        return;
      }

      // 已绑定 → 直接登录成功
      if (res.token) {
        onLoginSuccess(res.token);
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
