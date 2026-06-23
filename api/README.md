# IdeoTrack API

思政打卡 App 后端 API，基于 Node.js + Express + TypeScript + PostgreSQL。

## 环境准备

1. 复制 `.env.example` 为 `.env` 并填写真实配置。
2. 确保 PostgreSQL 可访问（本地、Docker 或云数据库均可）。

```bash
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL、JWT_SECRET 等
```

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
# 修改 POSTGRES_PASSWORD、JWT_SECRET 等关键配置

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
