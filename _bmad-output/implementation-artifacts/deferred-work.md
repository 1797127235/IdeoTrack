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

## Deferred from: code review of story 4-2-xin-de-ti-jiao (2026-06-24)

- [Review][Defer] 敏感词/套话检测使用朴素子串匹配 — `api/src/domains/reviews/reviews.service.ts` 当前使用 `includes` 匹配敏感词和套话，容易误伤且易被绕开；V1 规则引擎已知局限，后续可引入分词/评分/语义模型。
- [Review][Defer] Jaccard 字符相似度指标不适用于中文 — `api/src/domains/reviews/reviews.service.ts` 使用字符集合 Jaccard 判断与任务内容相似度，阈值 0.7 缺乏经验依据；后续可改为基于词/句向量的语义相似度。
- [Review][Defer] 未对 reflection 接口做限流/滥用防护 — `api/src/domains/checkins/checkins.routes.ts` 学生可重复调用提交/修改心得，触发 LLM 调用和 DB 写入；后续在网关或路由层增加限流。
- [Review][Defer] 缺少独立的 AI 审核审计日志 — `api/src/domains/checkins/checkins.service.ts` 仅将 `ai_review_reason` 保存在当前 check-in 行，无法追溯每次提交与最终结果；后续可引入审计表。
- [Review][Defer] 用户输入未做服务端清洗，存在跨客户端 XSS 隐患 — `api/src/domains/checkins/checkins.service.ts` 原样存储 `reflection_content`，WXML 的 `{{}}` 已自动转义故当前小程序安全；若未来在 web 管理端/导出/通知中渲染同一份数据，需做清洗。
- [Review][Defer] 新建索引暂无对应查询 — `api/src/scripts/migrate.ts` 新增 `idx_check_ins_reflection_status` 供后续辅导员复核列表使用，本次实现中无查询使用；规范中标注为可选索引。

## Deferred from: code review decision of story 4-2-xin-de-ti-jiao (2026-06-24)

- [Review][Defer] 结果页显示固定/伪造的积分与等级数据 — `miniprogram/pages/checkin/result/index.wxml:35-51` 硬编码 “+10 积分”“1 连续天数”“10% 等级进度”。用户决策：V1 保留静态占位，由后续 Story 4.3 / Epic 6 接入真实数据。

## Deferred from: code review of story 14-1-nextjs-gong-cheng-chu-shi-hua (2026-06-24)

- [Review][Defer] logout 无服务端撤销（token 留存到 exp） — `web/lib/api.ts` logout() 仅清本地 token，无 /api/auth/logout 调用或 token 黑名单。需后端加 token 撤销机制，跨 story 范围，V2 安全加固时引入。
- [Review][Defer] token 过期后页面停留（无定时检查） — `web/components/AuthGuard.tsx` 仅 mount 时检查 exp，无 setInterval/visibility 监听。下次请求会 401 触发清 token，非阻塞，作为增强后续处理。
- [Review][Defer] 生产 CLIENT_URL=* 开放 + 无 web 构建步骤 — `.github/workflows/deploy.yml` 生产 .env 仍写 CLIENT_URL=*，且无 web 构建步骤。AC-6/生产部署 defer 到 Story 14.2，deploy.yml 已留 TODO 注释。
- [Review][Defer] NEXT_PUBLIC_API_BASE_URL 构建时内联，生产可能 localhost — `web/lib/api.ts:10` 读 NEXT_PUBLIC_* 会被 Next.js 构建时内联，生产镜像构建时若未设则固化 localhost。生产部署 story 处理。
