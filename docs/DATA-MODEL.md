# 数据模型与组织关系

IdeoTrack 的核心数据围绕「学院 → 班级 → 学生」的组织树展开，辅导员、用户、任务、打卡都挂在这棵树上。本文说明关键实体、关系约束和涉及代码，方便后续接手与扩展。

## 实体关系总览

```
学院 college
  └── 班级 class（1 个学院 → N 个班）
        └── 学生 user(role=student)（1 个班 → N 个学生）

辅导员 user(role=counselor)
  ├── 直属学院：users.college_id（一所一属，唯一归属）
  └── 所带班级：counselor_classes（1 个辅导员 → N 个班，但必须同属其直属学院）

任务模板 task_template
  └── 管理员维护的内容快照，不直接面向学生

任务实例 task
  └── 发布范围 scope_type：school（全校）/ college（学院）/ class（班级）
        scope_id 指向 college 或 class（school 时为空）
        template_id 指向 task_template（模板派生时）

打卡 check_in
  └── 学生对某任务实例的打卡记录（含心得、人脸现场照、审核状态）

学习资料 learning_resource
  └── 管理员发布的学习内容（图文、视频、文档、链接）
```

## 关键表结构

| 表 | 说明 | 关键字段 |
|---|---|---|
| `colleges` | 学院 | `id`, `name`（唯一） |
| `classes` | 班级 | `id`, `college_id`, `name`，唯一约束 `(college_id, name)` |
| `users` | 所有角色账号 | `school_id`（唯一）, `role`, `college_id`, `class_id`, `password_hash`, `wechat_openid`, `is_enabled` |
| `counselor_classes` | 辅导员↔所带班级 | `counselor_id`, `class_id`，唯一约束 `(counselor, class)` |
| `task_templates` | 任务模板库 | `title`, `description`, `content`, `cover_image`, `category`, `tags`, `checkin_type`, `require_*`, `geo_*`, `require_face`, `status`, `start_time`, `end_time`, `attachment_url` |
| `tasks` | 思政任务实例 | `scope_type`, `scope_id`/`target_college_id`/`target_class_id`, `template_id`, 继承模板全部字段 |
| `check_ins` | 打卡记录 | `user_id`, `task_id`, `status`, `reflection_content`, `geo_*`, `face_photo_path`, `face_verified`, `face_similarity` |
| `user_faces` | 注册照 + 人脸向量 | `user_id`, `photo_path`, `embedding` |
| `learning_resources` | 学习资料 | `title`, `type`, `content`/`url`, `cover_url`, `category`, `tags`, `status` |
| `ai_reviews` | AI 初审记录 | `check_in_id`, `status`, `reason`, `reason_code` |
| `point_records` | 积分发放记录 | `user_id`, `check_in_id`, `points`, `reason` |
| `reminders` | 一键提醒记录 | `counselor_id`, `class_id`, `student_id`, `task_id`, `reminder_date`, `status` |
| `audit_logs` | 审计日志 | `action`, `category`, `actor_id`, `target_type`, `target_id`, `details` |

> 完整建表 SQL 见 [`api/src/scripts/migrate.ts`](../api/src/scripts/migrate.ts)。

## 角色说明

| 角色 | 登录方式 | 学院归属 | 班级归属 |
|---|---|---|---|
| 学生 `student` | 微信小程序 | **必填**（由班级推断） | **必填** `class_id` |
| 辅导员 `counselor` | Web / 小程序（工号密码 / 微信） | **必填** `college_id`（直属单一学院） | 通过 `counselor_classes` 管理本院多个班 |
| 管理员 `admin` | Web 后台（工号密码） | 无 | 无 |

## 辅导员-学院归属规则（一所一属）

辅导员**直属且仅属一个学院**，所带的所有班级必须同属该学院。这是业务层的硬约束（非 DB 约束，因 seed/测试用原始 SQL 插数据会绕过）：

- **创建辅导员**：必须提供 `collegeId`，否则报 `COUNSELOR_REQUIRES_COLLEGE`。
- **切换辅导员归属学院**：自动清空其旧的所带班级关联（`counselor_classes`），避免脏数据。
- **分配所带班级**：每个班级的 `college_id` 必须等于辅导员的 `college_id`，否则报 `CLASS_COLLEGE_MISMATCH`。

涉及代码：`api/src/domains/users/users.service.ts` 的 `createUser` / `updateUser` / `setManagedClasses`。

## 默认密码规则

新建/导入用户初始密码 = `学号/工号 末 6 位`（不足 6 位取整个字符串，左侧补 0），首次登录标记 `is_initial_password=true`，强制改密。

```ts
// api/src/domains/users/users.service.ts
function generateDefaultPassword(schoolId: string): string {
  return schoolId.slice(-6).padStart(6, '0');
}
```

## 批量导入

| 入口 | 用途 | CSV 列 | 端点 |
|---|---|---|---|
| 组织架构页 | 学院 + 班级（幂等去重） | `学院`, `班级`（班级可空=只建学院） | `POST /api/users/batch-import-organizations` |
| 用户管理页 | 用户（按名称匹配已有组织） | `学号/工号`, `姓名`, `角色`, `学院`, `班级` | `POST /api/users/batch-import` |
| 用户管理页 | 注册照（zip，文件名=学号） | — | `POST /api/users/batch-face-import`（异步 job） |

**组织导入**幂等：学院重名跳过、同学院下班级重名跳过，重复导入同一份 CSV 不会产生重复数据。

**用户导入**要求组织（学院/班级）已存在；若不存在会逐行报错。典型流程：先导入组织 → 再导入用户 → 最后导入注册照。

## 任务模板与任务实例

IdeoTrack 将任务内容管理与任务发布分离：

- **任务模板库**：管理员在 Web 后台维护模板（`task_templates`），保存内容、说明、封面图、分类标签、思考题、外部链接/视频/附件、打卡类型与必填项、签到范围、人脸要求、起止时间、状态等快照，不指定发布范围。
- **发布任务实例**：辅导员在小程序从模板库选择模板，发布到所辖班级；管理员也可以直接将模板发布为全校/全院任务，或绕过模板直接创建任务实例。
- **角色边界**：管理员负责内容生产，辅导员负责班级教学组织，学生只接收任务实例并打卡。
- **字段继承**：从模板派生任务实例时，文案类字段（标题、内容、说明、封面、附件、打卡要求等）从模板复制；坐标类字段（`geo_lat/lng/radius_meters/address`）在发布时由发布者指定，模板仅保留 `require_location` 开关。详见 [`docs/TASK-TEMPLATES.md`](./TASK-TEMPLATES.md)。

### `task_templates` 关键字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | text | 模板标题（1-100 字） |
| `description` | text | 任务说明（≤500 字） |
| `content` | text | 任务正文（1-2000 字） |
| `cover_image` | text | 封面图相对路径，存于 `uploads/task-covers/` |
| `category` | text | 分类：`学习`/`实践`/`活动`/`会议`/`阅读` |
| `tags` | jsonb | 标签数组，每个标签 1-20 字 |
| `guiding_questions` | jsonb | 思考题数组 |
| `source_url` | text | 外部链接 |
| `video_url` | text | 视频 URL |
| `attachment_url` | text | 附件相对路径，存于 `uploads/attachments/` |
| `checkin_type` | text | 打卡类型：`text`/`image`/`video`/`mixed` |
| `require_text` | boolean | 是否要求文字心得 |
| `require_image` | boolean | 是否要求图片 |
| `require_video` | boolean | 是否要求视频 |
| `min_text_length` | integer | 最少字数（≥0） |
| `max_images` | integer | 最大图片数（1-9） |
| `require_location` | boolean | 是否要求定位签到 |
| `geo_lat/lng/radius_meters/address` | - | 签到坐标（模板可留空，发布时指定） |
| `require_face` | boolean | 是否要求人脸验证 |
| `status` | text | `draft`/`published`/`delisted` |
| `start_time`/`end_time` | timestamptz | 模板建议起止时间 |

### `tasks` 关键字段

任务实例表字段与模板基本一致，额外包含：

| 字段 | 说明 |
|---|---|
| `scope_type` | `school`/`college`/`class` |
| `scope_id` | 统一范围 ID（学院/班级 UUID，school 时为 NULL） |
| `target_college_id`/`target_class_id` | 与 `scope_id` 同步的目标学院/班级，用于查询 |
| `template_id` | 来源模板 ID；直接创建为 NULL |
| `published_at`/`deadline_at` | 实际发布时间 / 截止时间 |
| `status` | `published`/`delisted` |

约束：`valid_task_scope` CHECK 保证 scope_type 与 target id 组合合法；唯一索引 `idx_tasks_unique_template_dispatch` 防止同一模板重复派发至同一班级。

## 打卡记录状态机

`check_ins.status` 流转：

```
submitted → ai_reviewing → ai_approved → pending_manual_review → approved / rejected / requires_modification
```

| 状态 | 含义 |
|---|---|
| `submitted` | 学生提交心得/图片/视频 |
| `ai_reviewing` | 正在 AI 初审 |
| `ai_approved` | AI 初审通过，等待辅导员复核 |
| `pending_manual_review` | 进入辅导员待复核列表 |
| `approved` | 辅导员复核通过，发放积分 |
| `rejected` | 辅导员拒绝 |
| `requires_modification` | 要求修改后重新提交 |

涉及代码：`api/src/domains/checkins/checkins.service.ts`、`api/src/domains/reviews/reviews.service.ts`。

## 文件存储约定

数据库只存相对路径，实际文件落盘到本地文件系统（生产环境通过 Docker bind mount 持久化）。

| 用途 | 存储目录 | 读取端点 | 代码 |
|---|---|---|---|
| 任务/模板封面图 | `uploads/task-covers/{uuid}.ext` | `GET /api/upload/cover?path=...` | `api/src/lib/resource-storage.ts` |
| 任务/模板附件 | `uploads/attachments/{uuid}.ext` | `GET /api/upload/attachment?path=...` | `api/src/lib/resource-storage.ts` |
| 学习资料封面图 | `uploads/learning-resources/covers/{uuid}.ext` | 学习资料接口返回 URL | `api/src/lib/resource-storage.ts` |
| 人脸注册照 | `FACE_PHOTO_DIR`（默认 `uploads/faces/`） | 内部使用 | `api/src/domains/users/users.service.ts` |
| 导出文件 | `EXPORT_FILE_DIR`（默认 `uploads/exports/`） | `GET /api/exports/:token` | `api/src/lib/storage.ts` |

root 解析：优先 `LEARNING_RESOURCE_UPLOAD_DIR` 环境变量，否则进程工作目录下的 `./uploads`。

详见 [`docs/UPLOAD-AND-STORAGE.md`](./UPLOAD-AND-STORAGE.md)。

## 任务签到范围

管理员在 Web 后台创建/编辑任务模板或任务实例时，可用高德地图划定签到范围（点 + 半径），学生在小程序签到时必须处于该范围内。

- Web 地图组件：`web/components/GeofencePicker.tsx`
- 后端距离校验：`api/src/domains/checkins/checkins.service.ts`、`api/src/domains/tasks/task.utils.ts`
- 半径范围：50-1000 米

## 人脸模块（可选）

注册照 + 人脸比对依赖独立的 FastAPI 微服务（InsightFace）。未配置 `FACE_SERVICE_URL` 时降级：管理员仍可上传/保存原图，但不提向量、不做人脸校验。

- 微服务：`face-service/`
- 配置：`FACE_SERVICE_URL`、`FACE_PHOTO_DIR`
- 部署说明：[`docs/FACE-TEST-DEPLOY.md`](./FACE-TEST-DEPLOY.md)

## 辅导员报告导出

辅导员可在小程序一键导出看板报告（PDF/Excel）和任务打卡记录（Excel）。PDF 生成依赖 Chromium（Docker 镜像已内置 + 中文字体），本地开发需配置 `PUPPETEER_EXECUTABLE_PATH`。

- 生成器：`api/src/domains/counselor/report.generator.ts`
- 下载端点：`GET /api/exports/:token`（签名 token，无需 JWT）
- 配置：`PUPPETEER_EXECUTABLE_PATH`、`EXPORT_FILE_DIR`

详见 [`docs/API-REFERENCE.md`](./API-REFERENCE.md) 的 Counselor 章节。
