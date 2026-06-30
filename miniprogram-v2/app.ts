// 本机局域网 IP（真机调试用）。
// 注意：手机和电脑必须连同一个 WiFi，且后端已启动。
// 模拟器走 localhost；真机/预览走局域网 IP。
// 在开发者工具「详情 → 本地设置」里，可通过条件编译或直接改这里来切换。
const API_BASE_URL = 'http://192.168.46.96:3000';

App({
  globalData: {
    loggedIn: false,
    role: null,
    userInfo: null,
    apiBaseUrl: API_BASE_URL,
  },

  onLaunch() {
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('auth_token');
    const role = wx.getStorageSync('auth_user_role');

    if (token && role) {
      this.globalData.loggedIn = true;
      this.globalData.role = role;
    } else {
      this.globalData.loggedIn = false;
      this.globalData.role = null;
    }
  },
});
