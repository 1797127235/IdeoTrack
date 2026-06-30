import { createTask, uploadAttachment, CheckinType } from '../../../services/taskApi';
import { getCounselorClasses, CounselorClass  } from '../../../services/counselorApi';
import { getRegeo, searchInputTips, geocodeAddress, AMapLocation, PoiItem } from '../../../utils/amap';
import { getRole } from '../../../utils/token';

interface ClassOption extends CounselorClass {
  selected: boolean;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  name: string;
}

function toISOString(date: string, time: string): string {
  return `${date}T${time}:00`;
}

const DEFAULT_CENTER = {
  latitude: 39.909,
  longitude: 116.39742,
};

Page({
  data: {
    title: '',
    content: '',
    checkinType: 'text' as CheckinType,
    checkinTypes: [
      { key: 'text', label: '文字' },
      { key: 'image', label: '图片' },
      { key: 'video', label: '视频' },
    ],
    classes: [] as ClassOption[],
    requireLocation: false,
    requireFace: false,
    location: null as GeoLocation | null,
    mapCenter: DEFAULT_CENTER,
    markers: [] as { id: number; latitude: number; longitude: number; title: string }[],
    circles: [] as { latitude: number; longitude: number; radius: number; color: string; fillColor: string; strokeWidth: number }[],
    radius: 100,
    searchKeyword: '',
    searchResults: [] as PoiItem[],
    showSearchResults: false,
    attachmentUrl: null as string | null,
    attachmentName: '' as string,
    publishedDate: '',
    publishedTime: '',
    deadlineDate: '',
    deadlineTime: '',
    submitting: false,
  },

  onLoad() {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }
    this.loadClasses();
    this.initDefaultTime();
    this.initLocation();
  },

  async loadClasses() {
    try {
      const classes = await getCounselorClasses();
      this.setData({
        classes: classes.map((c) => ({ ...c, selected: false })),
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '加载班级失败',
        icon: 'none',
      });
    }
  },

  initDefaultTime() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const deadlineDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    const deadlineTime = time;

    this.setData({
      publishedDate: date,
      publishedTime: time,
      deadlineDate,
      deadlineTime,
    });
  },

  initLocation() {
    this.setData({
      mapCenter: DEFAULT_CENTER,
      markers: [],
      circles: [],
    });
  },

  onTitleInput(e: WechatMiniprogram.Input) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e: WechatMiniprogram.Textarea) {
    this.setData({ content: e.detail.value });
  },

  onCheckinTypeChange(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as CheckinType;
    this.setData({ checkinType: key });
  },

  onClassToggle(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const classes = this.data.classes;
    classes[index].selected = !classes[index].selected;
    this.setData({ classes });
  },

  onRequireLocationChange(e: WechatMiniprogram.Input) {
    const requireLocation = e.detail.value as boolean;
    this.setData({ requireLocation });
    if (requireLocation && !this.data.location) {
      this.locateCurrentPosition();
    }
  },

  onRequireFaceChange(e: WechatMiniprogram.Input) {
    this.setData({ requireFace: e.detail.value });
  },

  onLocateTap() {
    this.locateCurrentPosition(true);
  },

  locateCurrentPosition(showError = false) {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => this.doLocateCurrentPosition(),
            fail: (err) => {
              if (err.errMsg?.includes('auth deny')) {
                wx.showModal({
                  title: '需要位置权限',
                  content: '请在设置中允许使用位置信息，以便定位到当前位置',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  },
                });
              } else if (showError) {
                wx.showToast({ title: '位置授权失败', icon: 'none' });
              }
            },
          });
        } else {
          this.doLocateCurrentPosition();
        }
      },
      fail: () => {
        if (showError) {
          wx.showToast({ title: '获取权限设置失败', icon: 'none' });
        }
      },
    });
  },

  doLocateCurrentPosition() {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      timeout: 10000,
      success: async (res) => {
        await this.selectLocation({ latitude: res.latitude, longitude: res.longitude });
      },
      fail: (err) => {
        wx.showToast({ title: `定位失败：${err.errMsg || '请检查定位权限'}`, icon: 'none' });
      },
    });
  },

  async selectLocation(loc: AMapLocation) {
    try {
      const regeo = await getRegeo(loc);
      const location: GeoLocation = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: regeo.formattedAddress,
        name: regeo.address || regeo.formattedAddress,
      };
      this.setLocationData(location);
    } catch {
      this.setLocationData({
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`,
        name: '选中的位置',
      });
    }
  },

  setLocationData(location: GeoLocation) {
    const radius = this.data.radius;
    this.setData({
      location,
      mapCenter: { latitude: location.latitude, longitude: location.longitude },
      markers: [{ id: 0, latitude: location.latitude, longitude: location.longitude, title: location.name }],
      circles: [{
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        color: 'rgba(79,70,229,0.5)',
        fillColor: 'rgba(79,70,229,0.12)',
        strokeWidth: 2,
      }],
      showSearchResults: false,
    });
  },

  onMapTap(e: WechatMiniprogram.MapTapEvent) {
    const { latitude, longitude } = e.detail;
    this.selectLocation({ latitude, longitude });
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    if (!keyword.trim()) {
      this.setData({ searchResults: [], showSearchResults: false });
      return;
    }
    this.debouncedSearch(keyword);
  },

  debouncedSearch: (() => {
    let timer: number | null = null;
    return function (this: WechatMiniprogram.Page.Instance<Record<string, unknown>, Record<string, unknown>>, keyword: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        this.searchPlaces(keyword);
      }, 400) as unknown as number;
    };
  })(),

  async searchPlaces(keyword: string) {
    try {
      const results = await searchInputTips(keyword);
      this.setData({ searchResults: results, showSearchResults: results.length > 0 });
    } catch (err) {
      wx.showToast({ title: err instanceof Error ? err.message : '搜索失败', icon: 'none' });
    }
  },

  onSearchResultTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const item = this.data.searchResults[index];
    if (!item) return;
    this.selectLocation(item.location);
    this.setData({ searchKeyword: item.name, searchResults: [], showSearchResults: false });
  },

  onRadiusInput(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value, 10);
    const radius = Number.isNaN(value) ? 100 : Math.max(50, Math.min(1000, value));
    this.setData({ radius });
    if (this.data.location) {
      this.setLocationData(this.data.location);
    }
  },

  onChooseAttachment() {
    wx.chooseMessageFile({
      count: 1,
      type: 'all',
      success: async (res) => {
        const file = res.tempFiles[0];
        this.setData({ submitting: true });
        try {
          const path = await uploadAttachment(file.path, file.name);
          this.setData({
            attachmentUrl: path,
            attachmentName: file.name,
            submitting: false,
          });
        } catch (err) {
          wx.showToast({
            title: err instanceof Error ? err.message : '上传附件失败',
            icon: 'none',
          });
          this.setData({ submitting: false });
        }
      },
      fail: () => {
        wx.showToast({ title: '选择附件失败', icon: 'none' });
      },
    });
  },

  onRemoveAttachment() {
    this.setData({ attachmentUrl: null, attachmentName: '' });
  },

  onPublishedDateChange(e: WechatMiniprogram.Input) {
    this.setData({ publishedDate: e.detail.value });
  },

  onPublishedTimeChange(e: WechatMiniprogram.Input) {
    this.setData({ publishedTime: e.detail.value });
  },

  onDeadlineDateChange(e: WechatMiniprogram.Input) {
    this.setData({ deadlineDate: e.detail.value });
  },

  onDeadlineTimeChange(e: WechatMiniprogram.Input) {
    this.setData({ deadlineTime: e.detail.value });
  },

  onBackTap() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/teacher/tasks/index' }) });
  },

  async submit() {
    if (this.data.submitting) return;

    const { title, content, checkinType, classes, requireLocation, requireFace, location, radius, attachmentUrl, publishedDate, publishedTime, deadlineDate, deadlineTime } = this.data;
    const selectedClasses = classes.filter((c) => c.selected);

    if (!title.trim()) {
      wx.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }
    if (!content.trim()) {
      wx.showToast({ title: '请输入任务内容', icon: 'none' });
      return;
    }
    if (selectedClasses.length === 0) {
      wx.showToast({ title: '请选择目标班级', icon: 'none' });
      return;
    }
    if (requireLocation && !location) {
      wx.showToast({ title: '请在地图上选择签到位置', icon: 'none' });
      return;
    }

    const publishedAt = toISOString(publishedDate, publishedTime);
    const deadlineAt = toISOString(deadlineDate, deadlineTime);
    if (new Date(deadlineAt) <= new Date(publishedAt)) {
      wx.showToast({ title: '截止时间必须晚于发布时间', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      for (const cls of selectedClasses) {
        await createTask({
          title: title.trim(),
          content: content.trim(),
          checkin_type: checkinType,
          scope_type: 'class',
          scope_id: cls.class_id,
          published_at: publishedAt,
          deadline_at: deadlineAt,
          attachment_url: attachmentUrl,
          require_location: requireLocation,
          require_face: requireFace,
          ...(requireLocation && location
            ? {
                geo_lat: location.latitude,
                geo_lng: location.longitude,
                geo_radius_meters: radius,
                geo_address: location.address || location.name,
              }
            : {}),
        });
      }
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '发布失败',
        icon: 'none',
      });
      this.setData({ submitting: false });
    }
  },
});
