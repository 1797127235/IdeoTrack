"""
IdeoTrack 人脸识别微服务（InsightFace + ONNX，CPU 运行）。

职责：无状态地完成「图片进 → 向量/相似度出」，不连数据库、不做业务逻辑。
所有阈值判定、状态流转、照片存储均在 Node API 侧。

端点：
  GET  /health    健康检查
  POST /extract   单图 → 512 维特征向量
  POST /verify    双图 → 余弦相似度 + 是否同人
"""

import io
import os
import asyncio
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

# InsightFace 启动较慢（加载 ONNX 模型），放在模块级，进程内只加载一次。
from insightface.app import FaceAnalysis

# ─────────────────────────────────────────────────────────────────────────────
# 配置
# ─────────────────────────────────────────────────────────────────────────────

# 模型根目录：优先用 bind mount 的 /app/models，其次用 InsightFace 默认缓存。
MODEL_ROOT = os.environ.get("FACE_MODEL_ROOT", "/app/models")
# 模型名：buffalo_l 是 InsightFace 标准高精度包（CPU 上单图提取约 0.5-2s）
MODEL_NAME = os.environ.get("FACE_MODEL_NAME", "buffalo_l")
# 默认余弦相似度阈值（经验值，buffalo_l 同人一般 > 0.4）
DEFAULT_THRESHOLD = float(os.environ.get("FACE_DEFAULT_THRESHOLD", "0.42"))
# 模型推理并发上限：CPU 上 InsightFace 单图 0.5-2s 且吃满核，过多并发会 OOM/雪崩。
# 批量导入在 Node 侧发 4 路，这里再用信号量兜底，超出部分排队而非压垮进程。
MAX_CONCURRENCY = int(os.environ.get("FACE_MAX_CONCURRENCY", "2"))

app = FastAPI(title="IdeoTrack Face Service", version="1.0.0")

# 延迟初始化：首次请求时才加载模型，避免容器启动卡在模型加载上影响 healthcheck。
_face_app: Optional[FaceAnalysis] = None
_face_lock = asyncio.Lock()
# 模块级创建 Semaphore 安全：它仅在 await 时绑定事件循环，构造时不要求 loop 已运行。
_infer_sem = asyncio.Semaphore(MAX_CONCURRENCY)


async def get_face_app() -> FaceAnalysis:
    """惰性加载并缓存 FaceAnalysis 实例（线程安全的单例）。"""
    global _face_app
    if _face_app is not None:
        return _face_app
    async with _face_lock:
        # double-check，避免并发请求重复加载
        if _face_app is not None:
            return _face_app
        face = FaceAnalysis(
            name=MODEL_NAME,
            root=MODEL_ROOT,
            providers=["CPUExecutionProvider"],
        )
        face.prepare(ctx_id=0, det_size=(640, 640))
        _face_app = face
        return _face_app


@app.on_event("startup")
async def warmup_model() -> None:
    """启动时后台预热模型，让首个真实请求不卡顿。失败不阻塞启动（health 仍可用）。"""
    try:
        await get_face_app()
    except Exception as exc:  # noqa: BLE001
        # 仅记录到 stderr，不抛出：模型缺失时 /health 仍返回 ok，
        # 真实请求调到 /extract 时才会返回具体错误。
        import sys
        print(f"[face-service] model warmup failed: {exc}", file=sys.stderr)


# ─────────────────────────────────────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────────────────────────────────────

async def read_embedding(image_bytes: bytes) -> Optional[np.ndarray]:
    """从图片字节提取第一张人脸的 512 维归一化向量。无人脸返回 None。"""
    face_app = await get_face_app()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(img)

    # InsightFace 的 get 是同步阻塞调用，丢到线程池避免卡住事件循环；
    # 再用信号量限流，防止并发请求把 CPU/内存压垮（注意：asyncio.Semaphore
    # 非可重入，verify 串行调两次本函数是「acquire→release→再acquire」，不会死锁）。
    async with _infer_sem:
        faces = await asyncio.to_thread(face_app.get, img_np)
    if not faces:
        return None
    # 取置信度最高的人脸
    faces.sort(key=lambda f: f.det_score, reverse=True)
    embedding = faces[0].normed_embedding  # 已归一化，模长≈1
    return embedding


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """余弦相似度（向量已归一化时等于点积）。"""
    return float(np.dot(a, b))


# ─────────────────────────────────────────────────────────────────────────────
# 端点
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> JSONResponse:
    # 健康检查只看进程是否存活，不依赖模型是否加载完成（模型缺失不应让容器被判定为不健康）
    return JSONResponse({"status": "ok", "model_loaded": _face_app is not None})


@app.post("/extract")
async def extract(file: UploadFile = File(...)) -> JSONResponse:
    """单图提取特征向量。"""
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="empty image")

    try:
        embedding = await read_embedding(image_bytes)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"extract failed: {exc}") from exc

    if embedding is None:
        return JSONResponse({"detected": False, "embedding": []})

    return JSONResponse({
        "detected": True,
        "embedding": embedding.tolist(),
    })


@app.post("/verify")
async def verify(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    threshold: float = Form(DEFAULT_THRESHOLD),
) -> JSONResponse:
    """双图比对，返回余弦相似度与是否同人判定。"""
    img1 = await file1.read()
    img2 = await file2.read()
    if not img1 or not img2:
        raise HTTPException(status_code=400, detail="empty image")

    try:
        emb1 = await read_embedding(img1)
        emb2 = await read_embedding(img2)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"verify failed: {exc}") from exc

    if emb1 is None or emb2 is None:
        # 任一图未检测到人脸，无法比对
        return JSONResponse({
            "similarity": 0.0,
            "is_match": False,
            "detected": False,
            "detail": "one or both images have no detectable face",
        })

    sim = cosine_similarity(emb1, emb2)
    return JSONResponse({
        "similarity": round(sim, 4),
        "is_match": sim >= threshold,
        "detected": True,
        "threshold": threshold,
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
