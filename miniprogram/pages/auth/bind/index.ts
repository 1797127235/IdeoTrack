import { bindStudent } from '../../../services/authApi';
import { onLoginSuccess } from '../../../utils/auth';

function getHomeUrl(role: string): string {
  return role === 'counselor' ? '/pages/counselor/dashboard/index' : '/pages/home/index';
}

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
      this.setData({ errorMsg: '请输入账号' });
      return;
    }
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });
    try {
      const res = await bindStudent(openid, schoolId.trim(), password);
      onLoginSuccess(res.token, res.user);

      // 绑定成功 → 按角色进首页（switchTab 进入 tabBar 页）
      wx.switchTab({ url: getHomeUrl(res.user.role) });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '绑定失败',
        loading: false,
      });
    }
  },
});
