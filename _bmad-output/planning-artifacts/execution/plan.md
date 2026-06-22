# IdeoTrack 规划执行蓝图

## 目标
基于 `E:\MyHub\IdeoTrack\_bmad-output\planning-artifacts` 中的产品规划产物（brief.md / addendum.md / prd.md / review-rubric.md），生成三份执行层文档：
1. **MVP精简需求** — 聚焦V1可交付的最小可用产品需求
2. **WBS任务分解** — 将PRD中的功能需求（FR）分解为可执行的工作包
3. **里程碑设计** — 基于WBS设计开发阶段、交付节点与验收标准

## 源材料
- `briefs/brief-IdeoTrack-2026-06-22/brief.md` — 产品简介（问题、用户、场景、功能边界）
- `briefs/brief-IdeoTrack-2026-06-22/addendum.md` — 后续扩展与备选方案
- `prds/prd-IdeoTrack-2026-06-22/prd.md` — PRD（FR-1~FR-28、UJ-1~UJ-3、成功指标、NFR）
- `prds/prd-IdeoTrack-2026-06-22/review-rubric.md` — 评审意见与待修复项

## 执行阶段

### Stage 1 — 并行生成三份文档（Markdown）
- **Worker_A (MVP精简需求)**：基于PRD §5 MVP Scope + brief核心功能边界，输出精简版MVP需求，包含：核心功能清单（学生/辅导员/管理员三端）、技术约束、验收标准、排除项。
- **Worker_B (WBS任务分解)**：基于PRD全部FR需求，按模块分解为WBS工作包（L1模块→L2任务→L3子任务），每个工作包标注：编号、名称、描述、交付物、负责人角色、依赖关系、预估工时。
- **Worker_C (里程碑设计)**：基于WBS工作包，设计4个里程碑阶段（如：设计→开发→集成→交付），每个里程碑包含：目标、包含工作包、交付物、验收标准、时间节点。

### Stage 2 — 整合与格式转换
- 将三份 Markdown 文档统一转换为 `.docx` 格式
- 输出至 `E:\MyHub\IdeoTrack\_bmad-output\planning-artifacts\execution`

## 输出规范
- 语言：中文
- 格式：先输出 Markdown，再转为 `.docx`
- 文档结构清晰，使用标题层级、表格、列表
- 内容必须与PRD保持一致，不得虚构PRD中未提及的功能
