# IdeoTrack API 测试集（Bruno）

本目录包含 IdeoTrack 后端 API 的全部测试用例，使用 [Bruno](https://www.usebruno.com/) 编写。

> **⚠️ 前置依赖**：Bruno 是 HTTP 客户端，**必须先启动后端 API 服务**才能跑测试。本测试集不连接数据库，只通过 HTTP 调用接口。

## 快速开始（完整启动流程）

### 第 1 步：配置环境变量

在 `api/.env` 文件中配置（首次运行必须）：

```bash
# 后端服务
PORT=3000
NODE_ENV=development
CLIENT_URL=*

# Supabase（数据库 + 存储）— 替换为你自己的项目凭证
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# JWT（开发期任意 32+ 字符串）
JWT_SECRET=dev-jwt-secret-key-must-be-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# 微信小程序（仅微信登录测试需要，其他测试可不配）
WECHAT_APP_ID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序AppSecret
```

> 如果没有 Supabase 项目：去 https://supabase.com 免费注册创建，拿到上述凭证。

### 第 2 步：安装依赖 + 初始化数据库

```bash
cd api
npm install

# 创建数据库表结构
npm run db:migrate

# 填充测试数据（学生/管理员账号 + 示例名言 + 示例任务）
npm run db:seed
```

### 第 3 步：启动后端 API 服务

```bash
cd api
npm run dev
```

看到以下输出表示启动成功（**保持这个终端窗口开着**）：

```
API server running on port 3000
```

验证：浏览器访问 http://localhost:3000/api/auth/me 应返回：
```json
{"success":false,"error":{"code":"AUTH_UNAUTHORIZED","message":"未提供有效的认证令牌"}}
```

### 第 4 步：安装 Bruno 并打开测试集

1. 去 https://www.usebruno.com/downloads 下载安装 Bruno（免费，类似 Postman）
2. 打开 Bruno → 「Open Collection」→ 选择本目录 `test/`
3. 右上角环境下拉框切换到 **「本地开发」**

### 第 5 步：跑测试

**方式 A：逐个跑**（推荐首次）
左侧列表按**文件名编号顺序**（1 → 2 → 3...）依次点击每个请求，点「Send」。

**方式 B：批量跑**
点 Collection 根节点「IdeoTrack API」→ 顶部「Runner」→「Run All」。

**重要**：必须按编号顺序跑！前面的请求（登录、创建）会自动设置环境变量，供后续请求使用。

### 预期结果

每个请求都应该：
- **Assert 区域全绿**（✓ 状态码、响应字段符合断言）
- **Tests 区域**（如有）显示「1 test passed」

19 个请求全部绿色 = 全部测试通过 ✅

### 常见问题

| 问题 | 解决 |
|------|------|
| 全部请求报 ECONNREFUSED | 后端没启动 → 回第 3 步 `npm run dev` |
| 401 未认证 | 没按顺序跑 → 先跑 `auth/1-登录-学生` 和 `auth/2-登录-管理员` |
| 数据库相关错误 | 没初始化 → 回第 2 步跑 migrate + seed |
| 锁定错误（403 AUTH_ACCOUNT_LOCKED） | 账号被锁 → 重跑 `npm run db:seed` 解锁 |

## 测试集结构

```
test/
├── bruno.json                 # Collection 配置
├── README.md                  # 本文件
├── environments/
│   └── 本地开发.bru           # 环境变量（baseUrl、token 等）
├── auth/                      # 认证域（6 个）
│   ├── 1-登录-学生.bru        # POST /api/auth/login（学生）
│   ├── 2-登录-管理员.bru      # POST /api/auth/login（管理员）
│   ├── 3-登录-错误密码.bru    # 验证 401
│   ├── 4-登录-账号锁定.bru    # 验证锁定策略
│   ├── 5-获取当前用户.bru     # GET /api/auth/me
│   └── 6-微信登录-缺code.bru  # 验证参数校验
├── quotes/                    # 名言域（6 个）
│   ├── 1-每日名言-学生.bru
│   ├── 2-每日名言-未认证.bru
│   ├── 3-名言库列表-管理员.bru
│   ├── 4-创建名言.bru
│   ├── 5-更新与删除名言.bru
│   └── 6-删除名言.bru
└── tasks/                     # 任务域（7 个）
    ├── 1-发布任务-管理员.bru
    ├── 2-学生不能发布任务.bru  # RBAC 验证
    ├── 3-发布任务-截止早于发布.bru  # 参数校验
    ├── 4-任务列表-管理员.bru   # 分页验证
    ├── 5-下架任务-管理员.bru   # CR 修复点 P1
    ├── 6-PUT不能改状态.bru     # CR 修复点 P1
    └── 7-学生任务列表.bru
```

**共计 19 个测试请求**，覆盖 3 个业务域。

## 链式测试（自动传递 token）

测试集设计了**顺序依赖**——前面的请求会自动设置环境变量，供后续请求使用：

1. `auth/1-登录-学生` 成功后 → 自动存 `studentToken`
2. `auth/2-登录-管理员` 成功后 → 自动存 `adminToken`
3. `tasks/1-发布任务` 成功后 → 自动存 `taskId`
4. `tasks/5-下架任务` 用 `taskId` 下架刚创建的任务
5. `quotes/4-创建名言` 成功后 → 自动存 `quoteId`
6. `quotes/5,6` 用 `quoteId` 更新和删除

**重要**：请按文件名编号顺序执行（1 → 2 → 3...），不要打乱顺序。

## 环境变量

在 `environments/本地开发.bru` 中配置：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `baseUrl` | 后端 API 地址 | `http://localhost:3000` |
| `studentToken` | 学生 JWT（登录后自动填） | 空 |
| `adminToken` | 管理员 JWT（登录后自动填） | 空 |
| `taskId` | 测试任务 ID（创建后自动填） | 空 |
| `quoteId` | 测试名言 ID（创建后自动填） | 空 |

如果要测试其他环境（如部署后的服务器），复制一份 `.bru` 改 `baseUrl` 即可。

## 预置测试账号

测试依赖数据库里有以下账号（由 `api/src/scripts/seed.ts` 创建）：

| 角色 | 学号/工号 | 密码 |
|------|----------|------|
| 学生 | `2024001` | `024001`（学号后 6 位）|
| 辅导员 | `T001` | `T001`（工号，因长度不足 6 位取整个）|
| 管理员 | `A001` | `A001`（工号，因长度不足 6 位取整个）|

> 密码规则：`schoolId.slice(-6)`，学号/工号不足 6 位时取整个字符串。

如果数据库没有这些账号，先跑种子脚本：
```bash
cd api
npm run db:seed
```

## 测试覆盖的架构决策（AD）

| 测试 | 验证的 AD |
|------|----------|
| auth 全部 | AD-4（JWT 签发）|
| 2-学生不能发布任务 | AD-5（API 层 RBAC）|
| 5-下架任务、6-PUT不能改状态 | AD-5 + Epic 3 CR 修复 P1 |
| 4-任务列表分页 | Epic 3 CR 修复 P2/P3 |
| quotes 4-创建名言 | AD-10（按域组织）|

## 跑测试的预期结果

每个请求都应该：
- **Assert 区域全绿**（状态码、响应体字段符合断言）
- **Tests 区域**（如有）显示「1 test passed」

如果某个请求红了，看响应内容判断是：
- 后端没启动 → 启动 `npm run dev`
- 401 → 先跑登录请求拿 token
- 数据库没有测试账号 → 跑 `npm run db:seed`

## 给 AI 的说明

如果要用 AI 跑这些测试：
1. 每个 `.bru` 文件是纯文本，可直接阅读理解请求定义
2. `meta.name` 是测试名，`assert` 块是断言，`tests` 块是后置脚本
3. 按文件名编号顺序执行，前序请求设置的变量供后续使用
4. 全部 19 个请求通过 = API 核心功能验证通过
