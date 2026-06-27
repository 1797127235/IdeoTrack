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

## 任务签到范围

任务表 `tasks` 包含以下字段，用于限定学生签到的地理位置：

| 字段 | 类型 | 说明 |
|------|------|------|
| `geo_lat` | DECIMAL(10,8) | 签到范围中心纬度 |
| `geo_lng` | DECIMAL(11,8) | 签到范围中心经度 |
| `geo_radius_meters` | INTEGER | 签到半径（50-1000 米） |
| `geo_address` | TEXT | 地点名称/地址 |

创建/更新任务时传入这些字段，学生签到时后端会计算距离，超出范围返回 `CHECKIN_OUTSIDE_GEOFENCE`。

## 组织架构与用户管理

用户域 `/api/users`（仅管理员）管理学院、班级、用户和辅导员分配。完整数据关系见根目录 [数据模型说明](../docs/DATA-MODEL.md)。要点：

- **辅导员直属单一学院**：`users.college_id` 必填，所带班级必须同属该学院（`CLASS_COLLEGE_MISMATCH` 校验）。
- **批量导入端点**（均为 admin only）：
  - `POST /api/users/batch-import-organizations` — 导入学院+班级，幂等去重。
  - `POST /api/users/batch-import` — 导入用户（按名称匹配已有组织）。
  - `POST /api/users/batch-face-import` — 上传 zip 批量导入注册照（异步 job，返回 jobId，轮询 `GET /api/users/batch-face-import/:jobId`）。

## API 接口

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
