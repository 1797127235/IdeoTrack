# IdeoTrack 测试运行说明

这份说明给验收人员使用，按顺序执行即可验证后端 API、小程序类型检查和 Bruno 接口测试。

## 1. 准备环境

需要本机已安装：

- Node.js 24 或兼容版本
- npm
- Bruno 桌面端（如果使用图形界面跑接口测试）
- 一个可用的 Supabase 项目，并在 `api/.env` 中配置好 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`DATABASE_URL`、`JWT_SECRET`

`api/.env` 最少需要：

```bash
PORT=3000
NODE_ENV=development
CLIENT_URL=*
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
# 可选：自动化集成测试专用数据库。未配置时 npm test 会跳过破坏性 DB 测试。
TEST_DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=dev-jwt-secret-key-must-be-at-least-32-characters-long
JWT_EXPIRES_IN=7d
```

## 2. 后端自动化测试

```bash
cd api
npm install
npm run db:migrate
npm run db:seed
npm run build
npm test
```

预期结果：

- `npm run build` 通过
- `npm test` 通过

说明：后端集成测试会清理测试数据，只读取 `TEST_DATABASE_URL`。如果没有配置 `TEST_DATABASE_URL`，相关测试会跳过，`npm test` 仍应正常通过。不要把破坏性集成测试直接跑在生产库或重要开发库上。

## 3. 小程序类型检查

```bash
cd miniprogram
npm install
npm run tsc
```

预期结果：`tsc --noEmit` 通过。

## 4. Bruno 接口测试

先启动后端服务，并保持终端运行：

```bash
cd api
npm run db:migrate
npm run db:seed
npm run dev
```

### 方式 A：Bruno 桌面端

1. Bruno 打开仓库里的 `test/` 目录。
2. 右上角环境选择 `本地开发`。
3. 运行前先执行一次 `cd api && npm run db:seed`，确保测试账号未被锁定、密码为初始值。
4. 在 Runner 中运行整个 collection。

预期结果：`19` 个请求全部通过。

### 方式 B：命令行

另开一个终端：

```bash
cd test
npx --yes @usebruno/cli run . -r --env-file environments/本地开发.bru
```

预期结果：

```text
Requests      19 (19 Passed)
Assertions    53/53
Status        PASS
```

## 5. 常见失败处理

| 现象 | 处理 |
| --- | --- |
| Bruno 大量 401 | 先执行 `cd api && npm run db:seed`，再重新跑 |
| `AUTH_ACCOUNT_LOCKED` | 测试账号被错误密码请求锁定，执行 `npm run db:seed` |
| `ECONNREFUSED localhost:3000` | 后端没启动，执行 `cd api && npm run dev` |
| 数据库表或字段不存在 | 执行 `cd api && npm run db:migrate` |
| Bruno 的 `quoteId` 或 `taskId` 相关请求 404 | 前面的创建请求没有成功，先 seed 后从头跑整个 collection |
