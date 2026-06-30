import { fetchTaskTemplates, createTaskFromTemplate, TaskTemplate } from '../../../services/taskApi';
import { getCounselorClasses, CounselorClass  } from '../../../services/counselorApi';
import { getRegeo, searchInputTips, AMapLocation, PoiItem } from '../../../utils/amap';
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

function toDateTimeLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
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
    templates: [] as TaskTemplate[],
    selectedTemplateId: '',
    selectedTemplateRequireLocation: false,
    selectedTemplateAttachmentUrl: null as string | null,
    selectedTemplateAttachmentName: '' as string,
    classes: [] as ClassOption[],
    location: null as GeoLocation | null,
    mapCenter: DEFAULT_CENTER,
    markers: [] as { id: number; latitude: number; longitude: number; title: string }[],
    circles: [] as { latitude: number; longitude: number; radius: number; color: string; fillColor: string; strokeWidth: number }[],
    radius: 100,
    searchKeyword: '',
    searchResults: [] as PoiItem[],
    showSearchResults: false,
    publishedDate: '',
    publishedTime: '',
    deadlineDate: '',
    deadlineTime: '',
    loading: true,
    submitting: false,
  },

  onLoad() {
    const role = getRole();
    if (role === 'student') {
      wx.showToast({ title: '学生账号请使用学生端', icon: 'none' });
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [templateResult, classes] = await Promise.all([
        fetchTaskTemplates(1, 50),
        getCounselorClasses(),
      ]);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const defaultDeadlineDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      this.setData({
        templates: templateResult.items,
        classes: classes.map((c) => ({ ...c, selected: false })),
        mapCenter: DEFAULT_CENTER,
        markers: [],
        circles: [],
        publishedDate: defaultDate,
        publishedTime: defaultTime,
        deadlineDate: defaultDeadlineDate,
        deadlineTime: defaultTime,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none',
      });
    }
  },

  getSelectedTemplate(): TaskTemplate | undefined {
    return this.data.templates.find((t) => t.id === this.data.selectedTemplateId);
  },

  onTemplateSelect(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const template = this.data.templates.find((t) => t.id === id);
    const attachmentUrl = template?.attachment_url ?? null;
    const requireLocation = template?.require_location ?? false;
    this.setData({
      selectedTemplateId: id,
      selectedTemplateRequireLocation: requireLocation,
      selectedTemplateAttachmentUrl: attachmentUrl,
      selectedTemplateAttachmentName: attachmentUrl ? (attachmentUrl.split('/').pop() || '附件') : '',
      location: null,
      mapCenter: DEFAULT_CENTER,
      markers: [],
      circles: [],
      radius: 100,
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false,
    });

    if (requireLocation) {
      this.locateCurrentPosition();
    }

    if (template?.start_time && template?.end_time) {
      const start = toDateTimeLocal(template.start_time);
      const end = toDateTimeLocal(template.end_time);
      this.setData({
        publishedDate: start.date,
        publishedTime: start.time,
        deadlineDate: end.date,
        deadlineTime: end.time,
      });
    }
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

  onClassToggle(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const classes = this.data.classes;
    classes[index].selected = !classes[index].selected;
    this.setData({ classes });
  },

  onRadiusInput(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value, 10);
    const radius = Number.isNaN(value) ? 100 : Math.max(50, Math.min(1000, value));
    this.setData({ radius });
    if (this.data.location) {
      this.setLocationData(this.data.location);
    }
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

    const { selectedTemplateId, classes, location, radius, publishedDate, publishedTime, deadlineDate, deadlineTime } = this.data;
    const selectedClasses = classes.filter((c) => c.selected);

    if (!selectedTemplateId) {
      wx.showToast({ title: '请选择任务模板', icon: 'none' });
      return;
    }
    if (selectedClasses.length === 0) {
      wx.showToast({ title: '请选择目标班级', icon: 'none' });
      return;
    }

    const template = this.getSelectedTemplate();
    const requireLocation = template?.require_location ?? false;
    if (requireLocation && !location) {
      wx.showToast({ title: '该模板需要定位签到，请在地图上选点', icon: 'none' });
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
      await createTaskFromTemplate({
        template_id: selectedTemplateId,
        scope_type: 'class',
        target_class_ids: selectedClasses.map((c) => c.class_id),
        published_at: publishedAt,
        deadline_at: deadlineAt,
        ...(requireLocation && location
          ? {
              geo_lat: location.latitude,
              geo_lng: location.longitude,
              geo_radius_meters: radius,
              geo_address: location.address || location.name,
            }
          : {}),
      });
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
