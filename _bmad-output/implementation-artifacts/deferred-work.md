# Deferred Work

## Deferred from: code review of story 1-1-xue-hao-gong-hao-mi-ma-deng-lu (2026-06-22)

- [Review][Defer] 首次登录强制跳转修改密码页 — `mobile/app/(auth)/login.tsx:35` 当前仅留下 TODO，待 Story 1.2 实现修改密码页后再接入（用户决定保留 TODO）。
- [Review][Defer] 缺少 IP/请求级速率限制 — `api/src/index.ts` 当前仅依赖账号锁定防御暴力破解，IP 级限速可在 V2 安全加固时引入。
- [Review][Defer] 缺少迁移历史表与回滚机制 — `api/src/scripts/migrate.ts` 为一次性执行脚本，未记录迁移版本；当前规模可用，后续可引入 node-pg-migrate 等工具。
- [Review][Defer] 后端使用 Supabase service-role key — `api/src/lib/supabase.ts` 使用服务角色密钥访问数据库，这是“后端即唯一访问层”架构下的设计选择；如启用 RLS，需评估是否需要拆分权限。
- [Review][Defer] tsconfig 测试文件类型范围 — `api/tsconfig.json:19` 仅 include `src/**/*`，`vitest/globals` 类型对 `tests/` 文件可能不生效；不影响运行，可在后续统一测试 tsconfig 时处理。

## Deferred from: MVP scope adjustment (2026-06-23)

MVP 重新定义为学生打卡核心闭环 + 辅导员管理功能。以下 FR/Epic 移出 MVP，推迟到 V2：

| FR | 内容 | 原 Epic | 移出原因 | V2 引入条件 |
|---|---|---|---|---|
| FR-15 | 积分计算 | Epic 6 | 激励体系，MVP 核心闭环可先不依赖 | 运营需要激励学生持续参与时 |
| FR-16 | 等级晋升 | Epic 6 | 同上 | 积分体系引入后配套 |
| FR-17 | 勋章授予 | Epic 6 | 同上 | 积分体系引入后配套 |
| FR-19 | 班级打卡率排名 | Epic 7 | 集体激励，MVP 辅导员看板已满足管理需求 | 学校反馈需要班级间竞争氛围时 |
| FR-20 | 排行榜数据刷新 | Epic 7 | 同上 | 班级排行榜引入后配套 |

**保留在 MVP 的相关项：**
- FR-18 个人打卡日历：保留在 Epic 6 / Story 6.4，实现成本低，帮助学生回顾个人历史。
- FR-21 班级数据概览：保留在 Epic 8，是辅导员管理核心。
- Epic 8 整体保留：班级数据概览、未打卡名单、一键提醒、数据导出均为辅导员管理必需。

**影响说明：**
- PRD §5.1 / §5.2 已更新 MVP 范围。
- `epics.md` 已标记 Epic 6 部分推迟、Epic 7 整体推迟。
- `sprint-status.yaml` 已标记相关 story 为 V2 deferred。
