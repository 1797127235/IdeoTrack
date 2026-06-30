# IdeoTrack API

思政打卡 App 后端 API，基于 Node.js + Express + TypeScript + PostgreSQL。

## 环境准备

1. 复制 `.env.example` 为 `.env` 并填写真实配置。
2. 确保 PostgreSQL 可访问（本地、Docker 或云数据库均可）。

```bash
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL、JWT_SECRET、NEXT_PUBLIC_AMAP_JSAPI_KEY 等
```

> `NEXT_PUBLIC_AMAP_JSAPI_KEY` 用于 Web 管理后台的地图选点（高德地图 JS API）。
> 
> 新增配置：
> - `PUPPETEER_EXECUTABLE_PATH`：辅导员报告 PDF 导出需要 Chromium/Edge 可执行路径。
> - `LEARNING_RESOURCE_UPLOAD_DIR`：上传文件根目录，默认 `./uploads`。
> - `EXPORT_FILE_DIR`：导出文件临时目录，默认 `./uploads/exports`。
> - `FACE_SERVICE_URL` / `FACE_PHOTO_DIR`：人脸服务地址与注册照目录。

## 数据库迁移

```bash
npm run db:migrate
npm run db:seed
```

## 启动开发服务器

```bash
npm run dev
```

## 运行测试

```bash
npm test
```

> 集成测试需要 `DATABASE_URL` 或 `TEST_DATABASE_URL` 指向一个可写的数据库。

## 生产部署（Docker Compose）

项目根目录提供 `docker-compose.yml`，可在服务器上一键部署 API + PostgreSQL。

```bash
# 1. 在项目根目录创建并编辑环境变量
cp .env.example .env
# 修改 POSTGRES_PASSWORD、JWT_SECRET、NEXT_PUBLIC_AMAP_JSAPI_KEY 等关键配置

# 2. 启动服务
docker compose up -d

# 3. 执行数据库迁移和初始数据（生产镜像使用编译后的 dist）
docker compose exec api node dist/scripts/migrate.js
docker compose exec api node dist/scripts/seed.js
```

如需自动 HTTPS，使用 Caddy profile：

```bash
# 先修改 Caddyfile 中的域名
docker compose --profile with-caddy up -d
```

> 小程序业务域名必须是**备案域名 + HTTPS**。国外服务器无需备案，但中国大陆访问可能不稳定。

## 任务模板与任务实例

项目将任务内容管理与任务发布分离：

- 管理员维护**任务模板库**（`task_templates`），保存完整内容快照。
- 辅导员/管理员将已上架模板发布为**任务实例**（`tasks`），指定范围、截止时间、本次签到坐标。
- 支持封面图、附件、打卡类型（文字/图片/视频/混合）、定位签到、人脸验证等能力。

详见 [`docs/TASK-TEMPLATES.md`](../docs/TASK-TEMPLATES.md)。

## 任务签到范围

任务表 `tasks` 包含以下字段，用于限定学生签到的地理位置：

| 字段 | 类型 | 说明 |
|------|------|------|
| `geo_lat` | DECIMAL(10,8) | 签到范围中心纬度 |
| `geo_lng` | DECIMAL(11,8) | 签到范围中心经度 |
| `geo_radius_meters` | INTEGER | 签到半径（50-1000 米） |
| `geo_address` | TEXT | 地点名称/地址 |

创建/更新任务时传入这些字段，学生签到时后端会计算距离，超出范围返回 `CHECKIN_OUTSIDE_GEOFENCE`。

## 文件上传

- 封面图：`POST /api/upload/cover`（≤5MB，jpg/png/webp）
- 通用附件：`POST /api/upload/attachment`（≤20MB，文档/图片/音视频/压缩包）
- 公开读取：`GET /api/upload/cover?path=...`、`GET /api/upload/attachment?path=...`

详见 [`docs/UPLOAD-AND-STORAGE.md`](../docs/UPLOAD-AND-STORAGE.md)。

## 辅导员报告导出

辅导员可在小程序导出看板报告（PDF/Excel）和任务打卡记录（Excel）。

- PDF 生成依赖 `puppeteer-core`，需要系统安装 Chromium/Edge。
- Docker 生产镜像已内置 Chromium + 中文字体。
- 下载使用签名 token：`GET /api/exports/:token`。

相关代码：`api/src/domains/counselor/report.generator.ts`、`api/src/index.ts`。

## 组织架构与用户管理

用户域 `/api/users`（仅管理员）管理学院、班级、用户和辅导员分配。完整数据关系见根目录 [数据模型说明](../docs/DATA-MODEL.md)。要点：

- **辅导员直属单一学院**：`users.college_id` 必填，所带班级必须同属该学院（`CLASS_COLLEGE_MISMATCH` 校验）。
- **批量导入端点**（均为 admin only）：
  - `POST /api/users/batch-import-organizations` — 导入学院+班级，幂等去重。
  - `POST /api/users/batch-import` — 导入用户（按名称匹配已有组织）。
  - `POST /api/users/batch-face-import` — 上传 zip 批量导入注册照（异步 job，返回 jobId，轮询 `GET /api/users/batch-face-import/:jobId`）。

## API 接口

完整接口列表、请求/响应示例和错误码见 [`docs/API-REFERENCE.md`](../docs/API-REFERENCE.md)。

### POST /api/auth/login

登录接口。

请求体：

```json
{
  "schoolId": "2024001",
  "password": "240001"
}
```

成功响应：

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "role": "student",
      "isInitialPassword": true
    }
  }
}
```
