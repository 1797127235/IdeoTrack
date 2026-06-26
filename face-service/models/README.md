# 人脸模型目录

InsightFace 的模型文件放在这里，docker-compose 会把本目录 bind mount 到容器内 `/app/models`。

## 两种方式（任选其一）

### 方式一：自动下载（首次启动时）

如果此目录为空，InsightFace 首次请求时会从 GitHub release 自动下载 `buffalo_l`（约 330MB）。

> ⚠️ 国内网络下载可能很慢或失败，建议用方式二预置。

### 方式二：手动预置（推荐）

1. 下载 `buffalo_l.zip`：
   https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip
2. 解压后，目录结构应为：
   ```
   face-service/models/
   └── buffalo_l/
       ├── 1k3d68.onnx
       ├── 2d106det.onnx
       ├── det_10g.onnx
       ├── genderage.onnx
       └── w600k_r50.onnx
   ```
3. 重启 face 服务即可。

## 说明

- `buffalo_l` 是 InsightFace 标准高精度模型包，CPU 上单图提取约 0.5-2 秒
- 模型文件较大，已通过 `.gitignore` 排除，不会提交到仓库
