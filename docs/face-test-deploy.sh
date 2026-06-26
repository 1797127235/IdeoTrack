#!/usr/bin/env bash
# 人脸模块服务器测试部署一键脚本（feature/face-recognition 分支，不触发正式 CI/CD）
# 用法：在服务器 /opt/IdeoTrack 下执行
#   bash docs/face-test-deploy.sh
# 幂等：可重复执行；任一步失败立即停止（set -euo pipefail）。
# 模型下载失败时会提示手动处理，不会假装成功。

set -euo pipefail

PROJECT_DIR="/opt/IdeoTrack"
BRANCH="feature/face-recognition"
MODEL_DIR="$PROJECT_DIR/face-service/models"
MODEL_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip"

c_ok()   { printf "\033[32m✔ %s\033[0m\n" "$1"; }
c_run()  { printf "\033[36m▶ %s\033[0m\n" "$1"; }
c_warn() { printf "\033[33m⚠ %s\033[0m\n" "$1"; }
c_err()  { printf "\033[31m✖ %s\033[0m\n" "$1"; }

cd "$PROJECT_DIR"

# ── 0. 前置检查 ──────────────────────────────────────────────
c_run "检查依赖..."
command -v git   >/dev/null || { c_err "缺少 git"; exit 1; }
command -v docker >/dev/null || { c_err "缺少 docker"; exit 1; }
docker compose version >/dev/null 2>&1 || { c_err "缺少 docker compose 子命令"; exit 1; }
c_ok "依赖就绪"

# ── 1. 拉取最新代码 ──────────────────────────────────────────
c_run "切换到 $BRANCH 并拉取..."
git fetch origin
# 若当前在别的分支且有未提交改动，checkout 会失败——这正是我们想要的（不静默丢弃）
git checkout "$BRANCH" 2>/dev/null || {
  c_err "无法切换到 $BRANCH（可能有未提交改动）。请手动处理后重跑。"
  git status --short
  exit 1
}
git pull --ff-only origin "$BRANCH"
c_ok "代码已更新：$(git log --oneline -1)"

# ── 2. 准备 buffalo_l 模型 ───────────────────────────────────
c_run "检查 buffalo_l 模型..."
mkdir -p "$MODEL_DIR"
if [ -f "$MODEL_DIR/buffalo_l/det_10g.onnx" ] && \
   [ -f "$MODEL_DIR/buffalo_l/w600k_r50.onnx" ]; then
  c_ok "模型已就位，跳过下载"
else
  c_warn "模型缺失，尝试从 GitHub 下载（~330MB，国内服务器可能慢/失败）..."
  cd "$MODEL_DIR"
  # 失败不立即退出，给出手动方案
  if wget -q --show-progress -O buffalo_l.zip "$MODEL_URL"; then
    unzip -o buffalo_l.zip
    rm -f buffalo_l.zip
    cd "$PROJECT_DIR"
    if [ -f "$MODEL_DIR/buffalo_l/det_10g.onnx" ]; then
      c_ok "模型下载完成"
    else
      c_err "解压后未找到预期文件，请检查 $MODEL_DIR 内容"
      exit 1
    fi
  else
    cd "$PROJECT_DIR"
    c_err "模型自动下载失败（网络问题）。请手动下载 buffalo_l.zip 解压到："
    echo "    $MODEL_DIR/buffalo_l/"
    echo "  期望文件：1k3d68.onnx 2d106det.onnx det_10g.onnx genderage.onnx w600k_r50.onnx"
    echo "  或从本地 scp 上传后重跑本脚本。"
    exit 1
  fi
fi

# ── 3. 配置 .env 人脸相关项 ──────────────────────────────────
c_run "检查 .env 人脸配置..."
cd "$PROJECT_DIR"
if [ ! -f .env ]; then
  c_warn ".env 不存在，创建最小测试 .env（生产 .env 由 CI/CD 生成）"
  c_err "请先确认 .env 已正确配置（DATABASE_URL/JWT_SECRET 等），再重跑。"
  exit 1
fi
# 幂等追加：没有 FACE_SERVICE_URL 就补
grep -q "^FACE_SERVICE_URL=" .env || echo "FACE_SERVICE_URL=http://face:8000" >> .env
grep -q "^FACE_PHOTO_DIR="    .env || echo "FACE_PHOTO_DIR=/app/faces"      >> .env
c_ok ".env 人脸配置就绪（FACE_SERVICE_URL / FACE_PHOTO_DIR）"

# ── 4. 构建并启动 face + api ─────────────────────────────────
c_run "构建 face 镜像（首次较慢，装 insightface/onnxruntime）..."
docker compose build face
c_ok "face 镜像就绪"

c_run "启动 face + api 容器..."
docker compose up -d face api
c_ok "容器已启动"

# ── 5. 等待 face 加载模型 ────────────────────────────────────
c_run "等待 face 服务加载模型（最多 60s）..."
for i in $(seq 1 30); do
  HEALTH=$(docker compose exec -T face curl -s http://localhost:8000/health 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"model_loaded": *true'; then
    c_ok "face 服务就绪，模型已加载"
    break
  fi
  sleep 2
  [ "$i" -eq 30 ] && {
    c_err "face 模型加载超时。最近日志："
    docker compose logs face --tail 30 || true
    exit 1
  }
done

# ── 6. 数据库迁移 ────────────────────────────────────────────
c_run "执行数据库迁移（user_faces 等表）..."
docker compose exec -T api node dist/scripts/migrate.js
c_ok "迁移完成"

# ── 7. 最终状态 ──────────────────────────────────────────────
echo ""
c_ok "===== 部署完成 ====="
docker compose ps face api
echo ""
echo "下一步：浏览器打开管理后台 → 用户管理，验证注册照列 / 上传 / 批量导入 / 预览。"
echo "纯命令行验证 face 提取："
echo "  docker compose cp /path/to/face.jpg face:/tmp/face.jpg"
echo "  docker compose exec face curl -s -X POST http://localhost:8000/extract -F file=@/tmp/face.jpg"
