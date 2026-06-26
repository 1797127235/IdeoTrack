# IdeoTrack 人脸识别微服务
# 注意：必须用 Debian-based 镜像（python:3.11-slim）。
# onnxruntime / numpy 没有 alpine wheel，alpine 会从源码编译，极慢且易失败。
# 这与本项目 Dockerfile.web 因 lightningcss 放弃 alpine 的惯例一致。

FROM python:3.11-slim AS builder

# 装系统依赖：
#   - build-essential/gcc：insightface 0.7.3 + 依赖 stringzilla 需现场编译 C 扩展，
#     新版 pip 不再提供预编译 wheel，缺编译器会报 "command 'gcc' failed"
#   - libgl1 / libglib2.0-0：OpenCV 动态链接（insightface 间接需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先拷 requirements 单独装，利用 docker 层缓存
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# 运行阶段
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# 运行时也需要 libgl1（OpenCV 动态链接）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 拷贝 pip 安装到 --user 的依赖
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

COPY app.py .

# 模型目录：docker-compose 会 bind mount ./face-service/models 到这里。
# 若目录为空，InsightFace 首次运行会尝试从 GitHub 下载 buffalo_l（~330MB）。
RUN mkdir -p /app/models

EXPOSE 8000

# 健康检查：模型未加载完成不影响 /health（进程存活即 ok）
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
