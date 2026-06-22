# IdeoTrack API 测试集（Bruno）

本目录包含 IdeoTrack 后端 API 的全部测试用例，使用 [Bruno](https://www.usebruno.com/) 编写。

## 快速开始（3 步跑通全部测试）

### 1. 安装 Bruno

去 https://www.usebruno.com/downloads 下载安装（免费，类似 Postman）。

### 2. 启动后端

```bash
cd api
npm install
npm run dev
# 看到 "API server running on port 3000" 即可
```

### 3. 在 Bruno 中打开本测试集

1. 打开 Bruno
2. 点「Open Collection」→ 选择本目录 `test/`
3. 右上角环境切换到「本地开发」
4. 左侧按顺序点击每个请求，或点 Collection 根节点 → 「Run」批量跑

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
