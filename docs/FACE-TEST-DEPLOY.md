# 人脸模块服务器测试部署

> 目标：在服务器上把 face 容器 + api 跑起来，验证人脸模块（注册照上传、批量导入、预览）。
> **不合并到 main**，直接在 feature 分支测试，不触发正式 CI/CD 部署。

所有命令在服务器 `root` 下执行，工作目录 `/opt/IdeoTrack`。

---

## 0. 前置确认

```bash
cd /opt/IdeoTrack
git --version         # 需有 git
docker --version      # 需有 docker
docker compose version
```

---

## 1. 拉取最新代码（feature 分支）

```bash
cd /opt/IdeoTrack
git fetch origin
git checkout feature/face-recognition
git pull origin feature/face-recognition
git log --oneline -1   # 应看到 a46d349 feat(face): admin photo management...
```

> ⚠️ 如果服务器之前是 main 且有本地修改，`git checkout` 可能报错。
> 正式部署目录一般保持干净；若报冲突，先 `git stash` 或联系我。

---

## 2. 准备 buffalo_l 模型（硬阻塞，不可跳过）

模型 ~330MB，被 gitignore，必须手动就位。

**方式 A：服务器直接下载（服务器能访问 github 时）**

```bash
cd /opt/IdeoTrack/face-service/models
# 下载（国内服务器可能慢/失败，失败就走方式 B）
wget https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip
unzip buffalo_l.zip
rm buffalo_l.zip
ls buffalo_l/   # 应有 5 个 .onnx：1k3d68 / 2d106det / det_10g / genderage / w600k_r50
```

**方式 B：本地下好 scp 上传**

本地下载 `buffalo_l.zip` 后：
```bash
# 在本地机器执行
scp buffalo_l.zip root@<服务器IP>:/opt/IdeoTrack/face-service/models/
```
再到服务器 `unzip` 同上。

---

## 3. 配置 .env（人脸相关）

正式 `.env` 由 CI/CD 生成。手动测试时确认这几行存在（没有就追加）：

```bash
cd /opt/IdeoTrack
# 检查是否已有 FACE_SERVICE_URL 和 FACE_PHOTO_DIR
grep -E "FACE_SERVICE_URL|FACE_PHOTO_DIR" .env || echo "缺失，见下方追加"
```

若缺失，追加到 `.env`：
```bash
cat >> .env <<'EOF'
FACE_SERVICE_URL=http://face:8000
FACE_PHOTO_DIR=/app/faces
EOF
```

---

## 4. 启动 face + api 容器（仅测试所需服务）

```bash
cd /opt/IdeoTrack
# 构建 face 镜像（首次较慢，装 insightface/onnxruntime）
docker compose build face
# 起 face + api（web/caddy 不用动）
docker compose up -d face api
```

face 容器首次启动会加载模型（~10-30s）。看日志确认模型加载成功：
```bash
docker compose logs face --tail 50
# 期望：无 "model warmup failed" 报错
```

---

## 5. 验证 face 微服务存活

```bash
# 健康检查（model_loaded 应为 true）
docker compose exec face curl -s http://localhost:8000/health
# 期望: {"status":"ok","model_loaded":true}
```

若 `model_loaded: false` → 模型没就位或加载失败，回第 2 步。

---

## 6. 执行数据库迁移（加 user_faces 等表）

```bash
docker compose exec -T api node dist/scripts/migrate.js
```

> 注意：生产镜像是 `dist/`，不是 `src/`。若报找不到 migrate.js，先 `docker compose exec api ls dist/scripts/`。

---

## 7. 功能验证（需先有 admin 登录态 cookie）

这部分最方便用管理后台 UI 点测：浏览器打开后台 → 用户管理页：
- 表格应多出「注册照」列
- 无图用户显示「上传」，点击可选图上传
- 有图用户显示缩略图 + 查看 + 删除
- 顶部「批量导入照片」上传 zip → 进度条轮询

**纯命令行验证 face 提取向量（绕过登录，最直接）**：
```bash
# 准备一张人脸 jpg，放到 face 容器内
docker compose cp /path/to/test-face.jpg face:/tmp/face.jpg
docker compose exec face curl -s -X POST http://localhost:8000/extract \
  -F "file=@/tmp/face.jpg"
# 期望: {"detected":true,"embedding":[...512个数字...]}
```

---

## 8. 测试完清理

测试用的 face 容器可保留，也可停掉：
```bash
docker compose stop face        # 停
# 或彻底移除（保留数据卷）
# docker compose down face api
```

确认无误后，再走正式 PR → main → CI/CD 上线。

---

## 常见问题

**Q: `docker compose up face` 报 insightface 装不上？**
A: Dockerfile 已固定 debian-slim + python3.11。确认没改 Dockerfile，`docker compose build --no-cache face`。

**Q: api 调 face 报 `FACE_UNAVAILABLE`？**
A: 检查 `docker compose exec api printenv FACE_SERVICE_URL` 是否为 `http://face:8000`，且 face 容器 `docker compose ps` 在跑。

**Q: 上传注册照报 `FACE_NOT_DETECTED`？**
A: 正常——照片里没检测到人脸。换清晰正脸照。face 服务不可用时会降级只存原图（embedding=null，hasFace=false）。
