# 文件上传与本地存储

IdeoTrack 将上传的文件（封面图、附件、学习资料封面、人脸照、导出文件）落盘到本地文件系统，数据库只保存相对路径。本文说明上传端点、读取方式、目录约定、权限控制和清理策略。

## 设计原则

1. **数据库不存大文件**：只存相对路径，避免 blob 进库。
2. **本地文件系统优先**：当前实现使用本地磁盘；后续可替换为对象存储而不改接口。
3. **公开读取**：封面图、附件、学习资料封面需要被小程序 `<image>` 直接访问，因此读取端点不校验 JWT。
4. **路径安全**：服务端通过 `path.normalize` 和目录前缀校验防止目录穿越。

## 上传根目录

由 `api/src/lib/resource-storage.ts` 解析：

```ts
function getUploadRoot(): string {
  return config.learningResourceUploadDir || path.join(process.cwd(), 'uploads');
}
```

即优先读取环境变量 `LEARNING_RESOURCE_UPLOAD_DIR`，否则使用 `./uploads`。

生产环境建议在 `docker-compose.yml` 中将 `./uploads` bind mount 到宿主机，避免容器重启丢数据。

## 封面图上传

### 端点

```
POST /api/upload/cover
Content-Type: multipart/form-data
Body: cover=<图片文件>
```

### 权限

需登录且角色为 `admin` 或 `counselor`。

### 限制

- 文件大小：≤5MB
- MIME 类型：`image/jpeg`、`image/png`、`image/webp`
- 扩展名：`.jpg`、`.jpeg`、`.png`、`.webp`

### 响应

```json
{
  "success": true,
  "data": {
    "path": "uploads/task-covers/a1b2c3d4.jpg",
    "url": "/api/upload/cover?path=uploads%2Ftask-covers%2Fa1b2c3d4.jpg"
  }
}
```

### 读取

```
GET /api/upload/cover?path=uploads/task-covers/a1b2c3d4.jpg
```

公开访问，返回图片二进制，设置 `Cache-Control: public, max-age=86400`。

### 存储路径

```
{uploadRoot}/task-covers/{uuid}.ext
```

例如：`uploads/task-covers/a1b2c3d4-...-.jpg`。

## 通用附件上传

### 端点

```
POST /api/upload/attachment
Content-Type: multipart/form-data
Body: attachment=<文件>
```

### 权限

需登录且角色为 `admin` 或 `counselor`。

### 限制

- 文件大小：≤20MB
- 允许格式：
  - 文档：`pdf`、`doc`、`docx`、`xls`、`xlsx`、`ppt`、`pptx`、`txt`
  - 压缩包：`zip`、`rar`
  - 图片：`jpg`、`jpeg`、`png`、`webp`、`gif`
  - 视频：`mp4`、`mov`
  - 音频：`mp3`、`wav`、`ogg`

### 响应

```json
{
  "success": true,
  "data": {
    "path": "uploads/attachments/e5f6g7h8.pdf",
    "url": "/api/upload/attachment?path=uploads%2Fattachments%2Fe5f6g7h8.pdf",
    "name": "学习资料.pdf"
  }
}
```

### 读取

```
GET /api/upload/attachment?path=uploads/attachments/e5f6g7h8.pdf
```

公开访问，按扩展名返回对应 MIME 类型。

### 存储路径

```
{uploadRoot}/attachments/{uuid}.ext
```

## 学习资料封面图

学习资料封面图使用同一套存储函数，但由 `learning-resources` 域内部调用，没有独立上传端点。

### 存储路径

```
{uploadRoot}/learning-resources/covers/{uuid}.ext
```

### 涉及代码

- `api/src/lib/resource-storage.ts`：`saveCoverImage`、`resolveCoverPath`、`deleteCoverImage`
- `api/src/domains/learning-resources/learning-resources.service.ts`

## 人脸注册照与现场照

| 类型 | 目录 | 说明 |
|---|---|---|
| 注册照 | `FACE_PHOTO_DIR`（默认 `uploads/faces/`） | 管理员批量导入或单张上传，提取人脸向量后原图保留 |
| 现场照 | 同 `FACE_PHOTO_DIR` | 学生打卡时拍摄，保存路径写入 `check_ins.face_photo_path` |

人脸照不通过 `/api/upload` 读取，仅供后端内部处理或审计。

## 导出文件

辅导员导出报告/打卡记录时，后端生成临时文件到 `EXPORT_FILE_DIR`（默认 `uploads/exports/`），并通过签名 token 提供一次性下载。

```
GET /api/exports/{token}
```

token 由 `api/src/lib/storage.ts` 生成与校验，包含 `fileId`、`ext`、`filename`、过期时间。下载完成后服务端尝试清理临时文件。

## 路径安全

读取端点对 `path` 参数做以下处理：

```ts
const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
const absPath = resolveTaskCoverPath(safePath);
const uploadRoot = path.join(process.cwd(), 'uploads');
if (!absPath.startsWith(uploadRoot)) {
  throw new AppError('ACCESS_DENIED', '无权访问该文件', 403);
}
```

- 过滤 `..` 开头的路径穿越尝试。
- 校验解析后的绝对路径必须在 `uploads` 根目录下。

## 文件清理策略

| 场景 | 行为 | 代码 |
|---|---|---|
| 模板/任务更新替换附件 | 删除旧附件 | `task-templates.service.ts`、`task.service.ts` |
| 模板删除 | 删除关联附件 | `task-templates.service.ts` |
| 导出文件下载完成 | 删除临时导出文件 | `api/src/index.ts` `/api/exports/:token` |
| 学习资料更新/删除封面 | 删除旧封面 | `learning-resources.service.ts` |

> 封面图在替换/删除时暂未主动清理，避免多任务共用同一张封面。如需要可后续补充引用计数或定时清理。

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `LEARNING_RESOURCE_UPLOAD_DIR` | 上传根目录 | `./uploads` |
| `FACE_PHOTO_DIR` | 人脸照目录 | `./uploads/faces` |
| `EXPORT_FILE_DIR` | 导出文件临时目录 | `./uploads/exports` |
| `PUPPETEER_EXECUTABLE_PATH` | Chromium 可执行路径，用于 PDF 导出 | - |

## 相关代码

| 文件 | 说明 |
|---|---|
| `api/src/lib/resource-storage.ts` | 封面图、附件的保存/解析/删除 |
| `api/src/lib/storage.ts` | 导出文件 token 与路径解析 |
| `api/src/domains/upload/upload.controller.ts` | 上传/读取控制器 |
| `api/src/domains/upload/upload.routes.ts` | 上传路由 |
| `web/components/FileUploader.tsx` | Web 通用附件上传组件 |
| `web/lib/upload.ts` | Web 上传 API 客户端 |
