Page({
  data: {
    feedback: '',
    contact: '',
  },

  onFeedbackInput(event: WechatMiniprogram.Input) {
    this.setData({ feedback: event.detail.value });
  },

  onContactInput(event: WechatMiniprogram.Input) {
    this.setData({ contact: event.detail.value });
  },

  submitFeedback() {
    const feedback = this.data.feedback.trim();
    const contact = this.data.contact.trim();

    if (!feedback) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' });
      return;
    }

    wx.setStorageSync('latestFeedback', {
      feedback,
      contact,
      createdAt: new Date().toISOString(),
    });

    this.setData({ feedback: '', contact: '' });
    wx.showToast({ title: '反馈已记录', icon: 'success' });
  },
});
