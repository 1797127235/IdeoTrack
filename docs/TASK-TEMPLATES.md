# 任务模板系统

本文档说明 IdeoTrack 任务模板（`task_templates`）与任务实例（`tasks`）的设计、字段含义、状态流转、权限边界和相关代码路径。

## 设计目标

- **内容复用**：管理员沉淀标准化思政任务内容，辅导员/管理员多次派发。
- **内容与发布分离**：模板只描述「任务是什么」，不指定发给谁；发布时才选择范围、截止时间、本次签到坐标。
- **灵活打卡**：支持文字、图片、视频、混合四种打卡类型，并可配置必填项、最少字数、最大图片数、定位、人脸等约束。

## 核心概念

| 概念 | 表 | 说明 |
|---|---|---|
| 任务模板 | `task_templates` | 管理员维护的内容快照，状态为 `draft`/`published`/`delisted` |
| 任务实例 | `tasks` | 学生实际接收到的任务，状态为 `published`/`delisted` |
| 从模板发布 | `POST /api/tasks/from-template` | 将已上架模板派生为 1-N 个任务实例 |
| 直接创建 | `POST /api/tasks` | 不经过模板，直接创建任务实例 |

## 状态流转

### 模板状态

```
                    publish
   draft ─────────────────────────► published
     ▲                                │
     │      update (文案/状态)        │
     └────────────────────────────────┘
                                     │ delist
                                     ▼
                                  delisted
```

- `draft`：草稿，仅管理员可见，可编辑所有字段。
- `published`：已上架，辅导员可在小程序选用，管理员可在 Web 直接发布为任务实例。
- `delisted`：已下架，不再允许新的派发，但已派发的任务实例不受影响。

> 当前实现中，`published` 与 `delisted` 之间可通过 `PUT /api/task-templates/:id` 修改 `status` 切换；`draft` 通过创建时指定 `status: 'published'` 或直接更新状态上架。

### 任务实例状态

- `published`：已发布，学生在可见范围内可打卡。
- `delisted`：已下架，学生端不再展示，但历史打卡记录保留。

## 字段详解

### 基础内容字段

| 字段 | 必填 | 限制 | 说明 |
|---|---|---|---|
| `title` | 是 | 1-100 字 | 任务标题 |
| `description` | 否 | ≤500 字 | 任务说明/摘要 |
| `content` | 是 | 1-2000 字 | 任务正文（支持 Markdown/富文本前端渲染） |
| `cover_image` | 否 | 5MB，jpg/png/webp | 封面图相对路径 |
| `category` | 否 | 枚举 | `学习`/`实践`/`活动`/`会议`/`阅读` |
| `tags` | 否 | 每项 1-20 字 | 标签数组 |
| `guiding_questions` | 否 | 非空字符串数组 | 思考题，引导学生打卡 |
| `source_url` | 否 | URL | 外部学习链接 |
| `video_url` | 否 | URL | 视频链接 |
| `attachment_url` | 否 | 20MB | 附件相对路径 |

### 打卡要求字段

| 字段 | 说明 | 约束 |
|---|---|---|
| `checkin_type` | 打卡类型 | `text`/`image`/`video`/`mixed` |
| `require_text` | 是否要求文字心得 | `text`/`mixed` 可设为 true；`image`/`video` 不可要求文字 |
| `require_image` | 是否要求上传图片 | `image`/`mixed` 可设为 true；`text`/`video` 不可要求图片 |
| `require_video` | 是否要求上传视频 | `video`/`mixed` 可设为 true；`text`/`image` 不可要求视频 |
| `min_text_length` | 最少字数 | ≥0，仅在 `require_text=true` 时生效 |
| `max_images` | 最大图片数 | 1-9，仅在 `require_image=true` 时生效 |
| `require_location` | 是否要求定位签到 | true 时发布必须提供坐标 |
| `require_face` | 是否要求人脸验证 | true 时学生打卡须拍照并与人脸底库比对 |

校验代码：`api/src/domains/task-templates/task-templates.schema.ts`。

### 时间与状态字段

| 字段 | 说明 |
|---|---|
| `start_time`/`end_time` | 模板的建议起止时间；派生为实例时，实例使用 `published_at`/`deadline_at` |
| `status` | `draft`/`published`/`delisted` |
| `created_by` | 创建该模板的管理员 ID |

## 从模板发布任务实例

### 流程

1. 调用 `GET /api/task-templates` 获取已上架模板列表（辅导员只能看到 `published`）。
2. 选择模板后，调用 `POST /api/tasks/from-template`。
3. 后端校验模板状态必须为 `published`。
4. 根据 `scope_type` 创建任务实例：
   - `school`：全校 1 条实例（仅管理员）。
   - `college`：指定学院 1 条实例（仅管理员）。
   - `class`：可为多个班级各创建 1 条实例（辅导员只能选自己所带班级）。
5. 文案类字段从模板复制；坐标字段优先使用发布请求传入的值，若未传则回退到模板残留值（仅当 `require_location=true`）。

### 关键代码

```ts
// api/src/domains/tasks/task.service.ts
export async function createTaskFromTemplate(
  userId: string,
  role: string,
  input: CreateTaskFromTemplateInput
): Promise<TaskResponse[]> {
  // 1. 拉取模板并校验 status === 'published'
  // 2. 按 scope_type 生成 1-N 条 tasks 记录
  // 3. 坐标优先用 input，其次用模板残留
}
```

### 发布请求示例

```json
POST /api/tasks/from-template
{
  "template_id": "a1b2c3d4-...",
  "scope_type": "class",
  "target_class_ids": ["class-uuid-1", "class-uuid-2"],
  "published_at": "2026-07-01T08:00:00Z",
  "deadline_at": "2026-07-07T23:59:59Z",
  "geo_lat": 31.2304,
  "geo_lng": 121.4737,
  "geo_radius_meters": 500,
  "geo_address": "上海市人民广场"
}
```

## 权限边界

| 操作 | 管理员 | 辅导员 | 学生 |
|---|---|---|---|
| 创建/编辑/删除模板 | ✅ | ❌ | ❌ |
| 查看模板列表 | ✅ 全部 | ✅ 仅 `published` | ❌ |
| 从模板发布全校/全院任务 | ✅ | ❌ | ❌ |
| 从模板发布班级任务 | ✅ | ✅ 仅自己所带班级 | ❌ |
| 直接创建任务实例 | ✅ | ✅ 仅自己所带班级 | ❌ |
| 编辑任务实例 | ✅ 仅非模板派生 | ✅ 仅自己直接创建的班级任务 | ❌ |
| 下架任务实例 | ✅ 全部 | ✅ 仅自己发布的 | ❌ |

## 删除限制

模板若已存在派发实例（`tasks.template_id = 模板ID`），则禁止删除，返回 `TASK_TEMPLATE_IN_USE`（409）。这是为了保护历史数据溯源。

```ts
// api/src/domains/task-templates/task-templates.service.ts
const dispatchedCount = await queryCount(
  'SELECT COUNT(*) FROM tasks WHERE template_id = $1',
  [id]
);
if (dispatchedCount > 0) {
  throw new AppError('TASK_TEMPLATE_IN_USE', '该模板已存在派发实例，无法删除', 409);
}
```

## 相关代码路径

| 层 | 路径 |
|---|---|
| 后端路由 | `api/src/domains/task-templates/task-templates.routes.ts` |
| 后端控制器 | `api/src/domains/task-templates/task-templates.controller.ts` |
| 后端服务 | `api/src/domains/task-templates/task-templates.service.ts` |
| 后端校验 | `api/src/domains/task-templates/task-templates.schema.ts` |
| 后端类型 | `api/src/domains/task-templates/task-templates.types.ts` |
| 任务发布服务 | `api/src/domains/tasks/task.service.ts` |
| 任务路由 | `api/src/domains/tasks/task.routes.ts` |
| Web 模板列表/创建/编辑 | `web/app/(admin)/task-templates/` |
| Web 模板 API 客户端 | `web/lib/task-templates.ts` |
| 小程序模板选用发布 | `miniprogram-v2/pages/teacher/task-publish-from-template/` |
