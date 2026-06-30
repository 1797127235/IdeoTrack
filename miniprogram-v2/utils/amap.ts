const AMAP_KEY = 'a69ee969a69e3bcc67702cf90df74213';
const BASE_URL = 'https://restapi.amap.com/v3';

export interface AMapLocation {
  latitude: number;
  longitude: number;
}

export interface RegeoResult {
  address: string;
  formattedAddress: string;
  city?: string;
  district?: string;
}

export interface PoiItem {
  id: string;
  name: string;
  address: string;
  location: AMapLocation;
  distance?: string;
}

function request<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && typeof res.data === 'object') {
          resolve(res.data as T);
        } else {
          reject(new Error('请求失败'));
        }
      },
      fail: () => reject(new Error('网络请求失败')),
    });
  });
}

function parseLocation(loc: string): AMapLocation | null {
  const [lng, lat] = loc.split(',').map(Number);
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
  return { longitude: lng, latitude: lat };
}

export async function getRegeo(location: AMapLocation): Promise<RegeoResult> {
  const url = `${BASE_URL}/geocode/regeo?key=${AMAP_KEY}&location=${location.longitude},${location.latitude}&extensions=base`;
  const data = await request<{
    status: string;
    regeocode?: {
      formatted_address: string;
      addressComponent?: {
        city?: string;
        district?: string;
        township?: string;
        street?: string;
        number?: string;
      };
    };
  }>(url);

  if (data.status !== '1' || !data.regeocode) {
    throw new Error('逆地理编码失败');
  }

  const comp = data.regeocode.addressComponent || {};
  const parts = [comp.city, comp.district, comp.township, comp.street, comp.number].filter(Boolean);
  return {
    address: parts.join('') || data.regeocode.formatted_address,
    formattedAddress: data.regeocode.formatted_address,
    city: comp.city,
    district: comp.district,
  };
}

export async function searchPoiAround(
  location: AMapLocation,
  options: { keywords?: string; radius?: number; page?: number; size?: number } = {}
): Promise<PoiItem[]> {
  const { keywords = '', radius = 1000, page = 1, size = 20 } = options;
  const url = `${BASE_URL}/place/around?key=${AMAP_KEY}&location=${location.longitude},${location.latitude}&keywords=${encodeURIComponent(keywords)}&radius=${radius}&offset=${size}&page=${page}&extensions=base`;
  const data = await request<{
    status: string;
    pois?: Array<{
      id: string;
      name: string;
      address: string;
      location: string;
      distance: string;
    }>;
  }>(url);

  if (data.status !== '1' || !data.pois) {
    throw new Error('周边搜索失败');
  }

  return data.pois
    .map((p) => {
      const loc = parseLocation(p.location);
      if (!loc) return null;
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        location: loc,
        distance: p.distance,
      };
    })
    .filter((p): p is PoiItem => p !== null);
}

export async function searchInputTips(keywords: string, city?: string): Promise<PoiItem[]> {
  if (!keywords.trim()) return [];
  const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
  const url = `${BASE_URL}/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}${cityParam}&datatype=poi`;
  const data = await request<{
    status: string;
    tips?: Array<{
      id: string;
      name: string;
      address: string;
      location: string;
      district: string;
    }>;
  }>(url);

  if (data.status !== '1' || !data.tips) {
    throw new Error('输入提示失败');
  }

  return data.tips
    .map((t) => {
      const loc = parseLocation(t.location);
      if (!loc) return null;
      return {
        id: t.id,
        name: t.name,
        address: [t.district, t.address].filter(Boolean).join(''),
        location: loc,
      };
    })
    .filter((p): p is PoiItem => p !== null);
}

export async function geocodeAddress(address: string, city?: string): Promise<AMapLocation | null> {
  const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
  const url = `${BASE_URL}/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}${cityParam}`;
  const data = await request<{
    status: string;
    geocodes?: Array<{ location: string }>;
  }>(url);

  if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
    return null;
  }
  return parseLocation(data.geocodes[0].location);
}
