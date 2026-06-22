# IdeoTrack API

思政打卡 App 后端 API，基于 Node.js + Express + TypeScript + Supabase。

## 环境准备

1. 复制 `.env.example` 为 `.env` 并填写真实配置。
2. 确保 Supabase 项目已创建，并获取 Service Role Key 和 Postgres 连接字符串。

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
