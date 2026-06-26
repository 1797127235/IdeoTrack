import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';

const AMAP_REGEO_URL = 'https://restapi.amap.com/v3/geocode/regeo';

export interface ReverseGeocodeResult {
  address: string;
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
  township: string;
  street: string;
  number: string;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  if (!config.amapWebKey) {
    throw new AppError('AMAP_NOT_CONFIGURED', '高德地图 Web 服务 Key 未配置', 503);
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError('GEO_COORDINATES_INVALID', '坐标超出有效范围', 400);
  }

  const url = new URL(AMAP_REGEO_URL);
  url.searchParams.set('key', config.amapWebKey);
  url.searchParams.set('location', `${longitude},${latitude}`);
  url.searchParams.set('extensions', 'all');
  url.searchParams.set('output', 'JSON');

  const resp = await fetch(url.toString(), { method: 'GET' });
  if (!resp.ok) {
    throw new AppError('AMAP_HTTP_ERROR', `高德地图服务异常: HTTP ${resp.status}`, 502);
  }

  const data = await resp.json() as {
    status: string;
    info: string;
    regeocode?: {
      formatted_address: string;
      addressComponent?: {
        province: string;
        city: string;
        district: string;
        township: string;
        street: string;
        number: string;
      };
    };
  };

  if (data.status !== '1' || !data.regeocode) {
    throw new AppError('AMAP_GEOCODE_FAILED', `逆地理编码失败: ${data.info || '未知错误'}`, 502);
  }

  const component = data.regeocode.addressComponent ?? {
    province: '',
    city: '',
    district: '',
    township: '',
    street: '',
    number: '',
  };

  const parts = [
    component.province,
    component.city,
    component.district,
    component.township,
    component.street,
    component.number,
  ].filter(Boolean);

  return {
    address: parts.join(''),
    formattedAddress: data.regeocode.formatted_address,
    province: component.province || '',
    city: component.city || '',
    district: component.district || '',
    township: component.township || '',
    street: component.street || '',
    number: component.number || '',
  };
}
