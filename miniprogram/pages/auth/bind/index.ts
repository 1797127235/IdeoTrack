import { bindStudent } from '../../../services/authApi';
import { onLoginSuccess } from '../../../utils/auth';

Page({
  data: {
    openid: '',
    schoolId: '',
    password: '',
    loading: false,
    errorMsg: '',
  },

  onLoad(options: { openid?: string }) {
    const openid = options.openid ? decodeURIComponent(options.openid) : '';
    this.setData({ openid });
  },

  onSchoolIdInput(e: WechatMiniprogram.Input) {
    this.setData({ schoolId: e.detail.value });
  },

  onPasswordInput(e: WechatMiniprogram.Input) {
    this.setData({ password: e.detail.value });
  },

  /** 提交绑定 */
  async handleSubmit() {
    if (this.data.loading) return;

    const { openid, schoolId, password } = this.data;
    if (!openid) {
      this.setData({ errorMsg: '登录凭证缺失，请重新登录' });
      return;
    }
    if (!schoolId.trim()) {
      this.setData({ errorMsg: '请输入学号' });
      return;
    }
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await bindStudent(openid, schoolId.trim(), password);
      onLoginSuccess(res.token);

      // 绑定成功 → 跳首页（reLaunch 清空登录页栈）
      wx.reLaunch({ url: '/pages/home/index' });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '绑定失败',
        loading: false,
      });
    }
  },
});
