# IdeoTrack — 思政打卡 App

面向高校大学生的思政学习打卡工具。学生通过微信小程序完成每日学习任务打卡，辅导员和管理员通过 App 管理和统计。

## 仓库结构

```
IdeoTrack/
├── api/            # 后端 API（Node.js + Express + TypeScript + Supabase）
├── mobile/         # 管理员/辅导员端 App（React Native + Expo）
├── miniprogram/    # 学生端微信小程序（原生开发）
├── test/           # API 测试集（Bruno）
└── project.config.json  # 微信开发者工具配置
```

## 快速开始

### 1. 启动后端 API

```bash
cd api
cp .env.example .env      # 然后编辑 .env 填入真实的 Supabase/JWT 凭证
npm install
npm run db:migrate        # 创建数据库表
npm run db:seed           # 填充测试数据（学生/管理员账号 + 示例名言 + 任务）
npm run dev               # 启动服务，监听 localhost:3000
```

看到 `API server running on port 3000` 即启动成功。

### 2. 跑 API 测试

详见 **[test/README.md](./test/README.md)** —— 用 Bruno 打开 `test/` 目录，19 个测试覆盖认证、名言、任务三大业务域。

### 3. 启动前端（按需）

**管理员/辅导员 App**：
```bash
cd mobile
npm install
npm start                 # Expo 开发服务器
```

**学生端微信小程序**：
- 用微信开发者工具打开仓库根目录（会自动读取 `project.config.json`）
- 详见 miniprogram/ 目录

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js 24 + Express 5 + TypeScript 6 |
| 数据库/存储 | Supabase（PostgreSQL + Storage）|
| 认证 | JWT（账号密码）+ 微信登录（学生端）|
| 管理端 | React Native 0.85 + Expo SDK 56 |
| 学生端 | 微信小程序原生（基础库 3.x）|

## 测试账号（由 `npm run db:seed` 创建）

| 角色 | 学号/工号 | 密码 |
|------|----------|------|
| 学生 | `2024001` | `024001` |
| 辅导员 | `T001` | `T001` |
| 管理员 | `A001` | `A001` |

> 密码规则：`schoolId.slice(-6)`，工号不足 6 位时取整个字符串。

## 文档

- 产品需求：见 `_bmad-output/planning-artifacts/prds/`（BMad 工作流产物）
- 架构设计：见 `_bmad-output/planning-artifacts/architecture/`
- API 测试说明：[test/README.md](./test/README.md)
