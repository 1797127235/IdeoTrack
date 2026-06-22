import { getToken } from '../../utils/token';

Page({
  data: {
    loggedIn: false,
  },

  onShow() {
    const loggedIn = !!getToken();
    this.setData({ loggedIn });
    if (!loggedIn) {
      wx.reLaunch({ url: '/pages/auth/login/index' });
    }
  },
});
