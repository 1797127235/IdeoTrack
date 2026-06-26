/**
 * 人脸识别微服务客户端。
 *
 * 转发图片到独立的 Python 服务（FastAPI + InsightFace，见 face-service/），
 * 该服务无状态地返回特征向量或比对相似度，不连数据库、不做业务逻辑。
 *
 * 职责切分：本模块只负责「调用 face 服务 + 处理失败」，
 * 阈值判定、照片存储、状态流转等业务逻辑在各 domain service 里。
 *
 * 降级策略：face 服务不可用（未配置/超时/HTTP错误）时，调用方应捕获
 * FaceServiceError 并降级处理（如标记 face_verified=null 待复核），不应阻塞核心流程。
 */

import { config } from '../config/index.js';

const FACE_TIMEOUT_MS = 15_000; // CPU 提取一张约 0.5-2s，留足余量

/** 人脸服务调用异常。调用方据此决定是否降级。 */
export class FaceServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'FACE_NOT_CONFIGURED' // 未配 FACE_SERVICE_URL
      | 'FACE_TIMEOUT'        // 调用超时
      | 'FACE_HTTP_ERROR'     // 服务返回非 2xx
      | 'FACE_UNAVAILABLE'    // 网络错误/连接拒绝
  ) {
    super(message);
    this.name = 'FaceServiceError';
  }
}

/** face 服务是否已配置（未配置时调用方应走「不要求人脸」的旁路）。 */
export function isFaceServiceConfigured(): boolean {
  return !!config.faceServiceUrl;
}

async function fetchFace(
  path: string,
  formData: FormData
): Promise<unknown> {
  if (!config.faceServiceUrl) {
    throw new FaceServiceError('人脸服务未配置（FACE_SERVICE_URL 为空）', 'FACE_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FACE_TIMEOUT_MS);
  try {
    const resp = await fetch(`${config.faceServiceUrl}${path}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new FaceServiceError(
        `人脸服务 HTTP ${resp.status}: ${detail.slice(0, 200)}`,
        'FACE_HTTP_ERROR'
      );
    }
    return await resp.json();
  } catch (err) {
    if (err instanceof FaceServiceError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FaceServiceError('人脸服务调用超时', 'FACE_TIMEOUT');
    }
    throw new FaceServiceError(
      `人脸服务不可用: ${err instanceof Error ? err.message : String(err)}`,
      'FACE_UNAVAILABLE'
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface ExtractResult {
  detected: boolean;
  embedding: number[]; // 检测到人脸时为 512 维，否则为空数组
}

/**
 * 提取单张图片的特征向量。
 * @param imageBytes 图片二进制（jpg/png）
 * @param filename   原始文件名（face 服务仅用于日志/类型推断）
 */
export async function extractEmbedding(
  imageBytes: Buffer | Uint8Array,
  filename = 'photo.jpg'
): Promise<ExtractResult> {
  const form = new FormData();
  form.append('file', new Blob([imageBytes]), filename);
  const data = (await fetchFace('/extract', form)) as ExtractResult;
  return {
    detected: data.detected,
    embedding: Array.isArray(data.embedding) ? data.embedding : [],
  };
}

export interface VerifyResult {
  detected: boolean;       // 两张图是否都检测到人脸
  similarity: number;      // 余弦相似度 [-1, 1]，未检测到时为 0
  isMatch: boolean;        // 是否判为同人（相似度 >= threshold）
  threshold: number;       // 实际使用的阈值
}

/**
 * 比对两张图片是否为同一人。
 * @param image1Bytes 注册照/基准照
 * @param image2Bytes 现场照
 * @param threshold   相似度阈值，默认 0.42（buffalo_l 经验值）
 */
export async function verifyFaces(
  image1Bytes: Buffer | Uint8Array,
  image2Bytes: Buffer | Uint8Array,
  threshold = 0.42
): Promise<VerifyResult> {
  const form = new FormData();
  form.append('file1', new Blob([image1Bytes]), 'reference.jpg');
  form.append('file2', new Blob([image2Bytes]), 'capture.jpg');
  form.append('threshold', String(threshold));
  const data = (await fetchFace('/verify', form)) as VerifyResult;
  return {
    detected: !!data.detected,
    similarity: typeof data.similarity === 'number' ? data.similarity : 0,
    isMatch: !!data.isMatch,
    threshold: typeof data.threshold === 'number' ? data.threshold : threshold,
  };
}
