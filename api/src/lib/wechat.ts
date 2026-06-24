import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';

interface AccessTokenCache {
  token: string | null;
  expiresAt: number;
}

const tokenCache: AccessTokenCache = { token: null, expiresAt: 0 };
const WECHAT_API_TIMEOUT_MS = 10_000;
const TOKEN_ERROR_CODES = new Set([40001, 42001]);

/** 重置 access_token 缓存，仅用于测试或 token 失效时重试。 */
export function resetWechatTokenCache(): void {
  tokenCache.token = null;
  tokenCache.expiresAt = 0;
}

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WECHAT_API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 获取微信小程序 access_token，带内存缓存。
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html
 */
export async function getWechatAccessToken(): Promise<string> {
  if (!config.wechatAppId || !config.wechatAppSecret) {
    throw new AppError('WECHAT_NOT_CONFIGURED', '微信小程序登录/提醒未配置', 500);
  }

  const now = Date.now();
  // 预留 60 秒缓冲，避免在过期临界点使用旧 token
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
    config.wechatAppId
  )}&secret=${encodeURIComponent(config.wechatAppSecret)}`;

  let resp: Response;
  try {
    resp = await fetchWithTimeout(url);
  } catch {
    throw new AppError('WECHAT_SERVICE_ERROR', '调用微信服务失败', 502);
  }

  if (!resp.ok) {
    throw new AppError('WECHAT_SERVICE_ERROR', `获取微信 access_token 失败: HTTP ${resp.status}`, 502);
  }

  const data = (await resp.json()) as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };

  if (!data.access_token) {
    throw new AppError(
      'WECHAT_SERVICE_ERROR',
      `微信 access_token 错误: ${data.errmsg || '未知错误'}`,
      502
    );
  }

  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + (data.expires_in || 7200) * 1000;
  return data.access_token;
}

/**
 * 发送微信小程序订阅消息。
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html
 */
export async function sendSubscribeMessage(
  openid: string,
  templateId: string,
  page?: string,
  data?: Record<string, { value: string }>
): Promise<void> {
  if (!config.wechatAppId || !config.wechatAppSecret) {
    throw new AppError('WECHAT_NOT_CONFIGURED', '微信小程序登录/提醒未配置', 500);
  }
  if (!templateId) {
    throw new AppError('WECHAT_TEMPLATE_MISSING', '缺少微信订阅消息模板 ID', 500);
  }

  async function attemptSend(retriesLeft: number): Promise<void> {
    const accessToken = await getWechatAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(
      accessToken
    )}`;

    const body: Record<string, unknown> = {
      touser: openid,
      template_id: templateId,
      miniprogram_state: config.isDev ? 'developer' : 'formal',
    };
    if (page) {
      body.page = page;
    }
    if (data) {
      body.data = data;
    }

    let resp: Response;
    try {
      resp = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AppError('WECHAT_SERVICE_ERROR', '调用微信服务失败', 502);
    }

    if (!resp.ok) {
      throw new AppError('WECHAT_SERVICE_ERROR', `调用微信订阅消息失败: HTTP ${resp.status}`, 502);
    }

    const result = (await resp.json()) as { errcode: number; errmsg: string };
    if (result.errcode !== 0) {
      if (TOKEN_ERROR_CODES.has(result.errcode) && retriesLeft > 0) {
        resetWechatTokenCache();
        return attemptSend(retriesLeft - 1);
      }
      throw new AppError(
        'WECHAT_SUBSCRIBE_SEND_FAILED',
        `微信订阅消息发送失败: ${result.errmsg} (errcode=${result.errcode})`,
        502
      );
    }
  }

  await attemptSend(1);
}
