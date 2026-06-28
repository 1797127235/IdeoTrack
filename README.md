# IdeoTrack — 思政打卡 App

面向高校大学生的思政学习打卡工具。学生和辅导员通过微信小程序完成打卡与管理，管理员通过 Next.js Web 后台进行组织管理、任务发布（含地图划定签到范围）和数据统计。

## 仓库结构

```
IdeoTrack/
├── api/            # 后端 API（Node.js + Express + TypeScript + PostgreSQL）
├── web/            # 管理员端 Web 后台（Next.js + App Router）★ V1
├── miniprogram/    # 学生 + 辅导员端微信小程序（原生开发）
├── mobile/         # [已弃用] 前管理员端 App（React Native + Expo），仅作参考
├── test/           # API 测试集（Bruno）
├── docker-compose.yml   # postgres + api + web（+ 可选 caddy profile）
├── Dockerfile.web       # 构建 web/ 管理端镜像
├── Caddyfile            # 反向代理：ideotrack.cc.cd→api, /admin*→web
└── project.config.json  # 微信开发者工具配置
```


## 快速开始

### 1. 启动后端 API

```bash
cd api
cp .env.example .env      # 然后编辑 .env 填入真实的 PostgreSQL/JWT/高德 Key 凭证
npm install
npm run db:migrate        # 创建数据库表
npm run db:seed           # 填充测试数据（学生/管理员账号 + 示例名言 + 任务）
npm run dev               # 启动服务，监听 localhost:3000
```

看到 `API server running on port 3000` 即启动成功。

### 2. 跑 API 测试

详见 **[test/README.md](./test/README.md)** —— 用 Bruno 打开 `test/` 目录，19 个测试覆盖认证、名言、任务三大业务域。

验收或从零拉取后跑全量测试，建议直接看 **[TESTING.md](./TESTING.md)**。里面包含后端自动化测试、小程序类型检查、Bruno GUI/CLI 的完整命令顺序。

### 3. 启动前端（按需）

**管理员端 Web 后台**：
```bash
cd web
npm install
# 需要配置 NEXT_PUBLIC_AMAP_JSAPI_KEY 才能使用任务签到范围地图选点
cp .env.example .env      # 或从父目录继承 .env
npm run dev               # Next.js 开发服务器（默认 localhost:3001）
```

**学生 + 辅导员端微信小程序**：
- 用微信开发者工具打开 `miniprogram/` 目录
- 学生通过微信登录，辅导员通过工号密码登录
- 详见 miniprogram/ 目录

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js 24 + Express 5 + TypeScript 6 |
| 数据库 | PostgreSQL 17（自托管，Docker）|
| 认证 | JWT（账号密码）+ 微信登录（学生端）|
| 管理端 | Next.js（App Router）+ TypeScript + 高德地图 JS API ★ V1 |
| 学生 + 辅导员端 | 微信小程序原生（基础库 3.x）|
| 反向代理 / 部署 | Caddy 2 + Docker Compose + GitHub Actions |


## 测试账号（由 `npm run db:seed` 创建）

| 角色 | 学号/工号 | 密码 |
|------|----------|------|
| 学生 | `2024001` | `024001` |
| 辅导员 | `T001` | `T001` |
| 管理员 | `A001` | `A001` |

> 密码规则：`schoolId.slice(-6)`，工号不足 6 位时取整个字符串。

## 组织架构与用户归属

IdeoTrack 围绕「学院 → 班级 → 学生」组织树构建，辅导员**直属且仅属一个学院**，所带班级必须同属该学院。详见 **[数据模型说明](./docs/DATA-MODEL.md)**。

### 批量导入

管理后台支持 CSV 批量导入（组织架构页 / 用户管理页）：

- **组织导入**：每行一条 `学院,班级`（班级可空=只建学院），幂等去重，重复导入不产生重复数据。
- **用户导入**：每行 `学号/工号,姓名,角色,学院,班级`，按名称匹配**已存在**的组织（先导入组织再导入用户）。
- **注册照导入**：上传 zip，文件名用学号（如 `2024001.jpg`），异步处理并轮询进度。

各页面均提供「下载导入模板」按钮。

## 任务模板与任务发布

IdeoTrack 将任务内容管理与任务发布分离：

- **任务模板库**：管理员在 Web 后台维护模板（`task_templates`），只保存内容、思考题、签到要求等快照，不指定发布范围。
- **发布任务实例**：辅导员在小程序从模板库选择模板，发布到所辖班级；管理员也可以直接将模板发布为全校/全院任务，或绕过模板直接创建任务实例。
- **角色边界**：管理员负责内容生产，辅导员负责班级教学组织，学生只接收任务实例并打卡。

## 任务签到范围

管理员在 Web 后台创建/编辑任务模板或任务实例时，可通过高德地图划定签到范围：
- 地图加载时自动定位到当前位置
- 支持搜索地点、点击地图选点
- 可调整半径（50-1000 米）
- 保存后学生在小程序签到时必须处于该范围内

相关代码：
- Web 地图组件：`web/components/GeofencePicker.tsx`
- 任务模板管理：`web/app/(admin)/task-templates/`
- 任务实例表单：`web/app/(admin)/tasks/create/page.tsx`、`web/app/(admin)/tasks/[id]/edit/page.tsx`
- 后端校验：`api/src/domains/checkins/checkins.service.ts`
- 距离计算：`api/src/domains/tasks/task.utils.ts`

## 文档

- 测试运行说明：[TESTING.md](./TESTING.md)
- 数据模型说明：[docs/DATA-MODEL.md](./docs/DATA-MODEL.md)
- API 说明：[api/README.md](./api/README.md)
- API 测试说明：[test/README.md](./test/README.md)
