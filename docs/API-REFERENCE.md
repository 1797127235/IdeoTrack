# API 接口参考

本文档按业务域列出 IdeoTrack 后端 API 的关键端点、请求/响应示例和权限要求。完整路由定义见各 `*.routes.ts` 文件。

Base URL：`http://localhost:3000/api`（开发环境）。

## 通用响应格式

```json
{
  "success": true,
  "data": { ... }
}
```

错误响应：

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "错误描述" }
}
```

## 认证（Auth）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/auth/login` | 账号密码登录（工号/学号 + 密码） | 公开 |
| POST | `/auth/logout` | 退出登录 | 登录 |
| GET | `/auth/me` | 获取当前登录用户信息 | 登录 |
| POST | `/auth/wechat-login` | 微信小程序登录（code） | 公开 |
| POST | `/auth/wechat-bind` | 绑定微信 openid 到现有账号 | 登录 |

### 登录示例

```json
POST /api/auth/login
{
  "schoolId": "A001",
  "password": "A001",
  "role": "admin"
}
```

响应会设置 HTTP-only Cookie `token`；后续请求自动携带。

## 用户（Users）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/users` | 用户列表（分页） | admin |
| POST | `/users` | 创建用户 | admin |
| PUT | `/users/:id` | 更新用户 | admin |
| DELETE | `/users/:id` | 删除用户 | admin |
| POST | `/users/batch-import` | CSV 批量导入用户 | admin |
| POST | `/users/batch-import-organizations` | CSV 批量导入学院/班级 | admin |
| POST | `/users/batch-face-import` | ZIP 批量导入注册照 | admin |
| POST | `/users/:id/reset-password` | 重置密码 | admin |
| POST | `/users/:id/set-managed-classes` | 设置辅导员所带班级 | admin |

## 任务模板（Task Templates）

路由：`api/src/domains/task-templates/task-templates.routes.ts`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/task-templates` | 模板列表（分页） | admin 全部；counselor 仅 `published` |
| GET | `/task-templates/:id` | 模板详情 | admin/counselor |
| POST | `/task-templates` | 创建模板 | admin |
| PUT | `/task-templates/:id` | 更新模板 | admin |
| PATCH | `/task-templates/:id/delist` | 下架模板 | admin |
| DELETE | `/task-templates/:id` | 删除模板 | admin |

### 创建模板请求示例

```json
POST /api/task-templates
{
  "title": "学习贯彻党的二十大精神",
  "description": "通过原文研读与心得撰写，深入理解二十大报告核心要义",
  "content": "请认真阅读党的二十大报告原文，结合自身实际撰写心得体会。",
  "cover_image": "uploads/task-covers/xxx.jpg",
  "category": "学习",
  "tags": ["党史", "二十大"],
  "guiding_questions": ["你印象最深刻的一句话是什么？", "结合自身谈谈体会。"],
  "source_url": "https://example.com/report",
  "video_url": "https://example.com/video.mp4",
  "attachment_url": "uploads/attachments/yyy.pdf",
  "checkin_type": "text",
  "require_text": true,
  "min_text_length": 100,
  "require_location": true,
  "geo_lat": 31.2304,
  "geo_lng": 121.4737,
  "geo_radius_meters": 500,
  "geo_address": "上海市人民广场",
  "require_face": false,
  "status": "published",
  "start_time": "2026-07-01T08:00:00Z",
  "end_time": "2026-07-07T23:59:59Z"
}
```

### 列表查询参数

```
GET /api/task-templates?page=1&limit=20&status=published
```

- `page`：页码，默认 1
- `limit`：每页条数，默认 20，最大 50
- `status`：`published`/`delisted`；辅导员传入无效，强制返回 `published`

## 任务实例（Tasks）

路由：`api/src/domains/tasks/task.routes.ts`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/tasks/my` | 学生查看自己的任务列表 | student |
| GET | `/tasks/my/:id` | 学生查看任务详情 | student |
| GET | `/tasks` | 管理员/辅导员查看任务实例列表 | admin/counselor |
| GET | `/tasks/:id` | 任务实例详情 | admin/counselor |
| POST | `/tasks` | 直接创建任务实例 | admin/counselor（辅导员仅限本班） |
| POST | `/tasks/from-template` | 从模板发布任务实例 | admin/counselor |
| PUT | `/tasks/:id` | 编辑任务实例 | admin/counselor（限制见下） |
| PATCH | `/tasks/:id/delist` | 下架任务实例 | admin/counselor |
| GET | `/tasks/:id/stats` | 任务完成统计 | admin/counselor |

### 直接创建任务实例请求示例

```json
POST /api/tasks
{
  "title": "班级主题班会",
  "description": "...",
  "content": "...",
  "checkin_type": "image",
  "require_image": true,
  "max_images": 3,
  "require_location": true,
  "geo_lat": 31.2304,
  "geo_lng": 121.4737,
  "geo_radius_meters": 200,
  "scope_type": "class",
  "scope_id": "class-uuid",
  "published_at": "2026-07-01T08:00:00Z",
  "deadline_at": "2026-07-07T23:59:59Z"
}
```

### 从模板发布请求示例

```json
POST /api/tasks/from-template
{
  "template_id": "template-uuid",
  "scope_type": "class",
  "target_class_ids": ["class-uuid-1", "class-uuid-2"],
  "published_at": "2026-07-01T08:00:00Z",
  "deadline_at": "2026-07-07T23:59:59Z",
  "geo_lat": 31.2304,
  "geo_lng": 121.4737,
  "geo_radius_meters": 500
}
```

### 编辑限制

- 管理员：不能编辑从模板派生的任务实例（应去编辑模板）。
- 辅导员：只能编辑自己直接创建的班级任务；模板派生实例只能下架。
- 已截止（`deadline_at <= now()`）的任务不可编辑。

## 打卡（Check-ins）

路由：`api/src/domains/checkins/checkins.routes.ts`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/checkins` | 学生打卡（含现场照） | student |
| POST | `/checkins/:id/reflection` | 提交/更新心得 | student |
| GET | `/checkins/:id/result` | 查看打卡结果 | student |
| GET | `/checkins/calendar` | 学生打卡日历 | student |
| GET | `/checkins/study-records` | 学习记录 | student |
| GET | `/checkins/reverse-geocode` | 坐标转地址 | student |

### 打卡请求示例

```bash
POST /api/checkins
Content-Type: multipart/form-data

photo=<现场照文件>
latitude=31.2304
longitude=121.4737
taskId=task-uuid
```

## 复核（Reviews）

路由：`api/src/domains/reviews/reviews.routes.ts`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/reviews/pending` | 待复核列表 | counselor |
| GET | `/reviews/pending/:id` | 待复核详情 | counselor |
| POST | `/reviews/:id/decision` | 复核决策 | counselor |

### 复核决策请求示例

```json
POST /api/reviews/checkin-uuid/decision
{
  "decision": "approve",
  "feedback": "心得体会深刻，同意通过。"
}
```

`decision` 可选：`approve`/`reject`/`require_modification`。

## 辅导员端（Counselor）

路由：`api/src/domains/counselor/counselor.routes.ts`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/counselor/dashboard` | 辅导员看板数据 | counselor |
| GET | `/counselor/checkin-trend` | 打卡趋势 | counselor |
| GET | `/counselor/classes` | 所带班级列表 | counselor |
| GET | `/counselor/classes/:id/detail` | 班级详情 | counselor |
| GET | `/counselor/classes/:id/students` | 班级学生列表 | counselor |
| POST | `/counselor/classes/:id/reminders` | 一键提醒 | counselor |
| GET | `/counselor/classes/:id/reminders` | 提醒记录 | counselor |
| GET | `/counselor/ranking` | 班级排行 | counselor |
| GET | `/counselor/high-risk-students` | 高风险学生 | counselor |
| GET | `/counselor/tasks/:id/classes` | 任务覆盖班级 | counselor |
| GET | `/counselor/tasks/:id/checkins` | 任务打卡详情 | counselor |
| GET | `/counselor/tasks/:id/checkins/export` | 导出任务打卡记录 | counselor |
| POST | `/counselor/reports/export` | 导出看板报告（PDF/Excel） | counselor |
| POST | `/counselor/exports` | 通用导出打卡记录 | counselor |

### 报告导出请求示例

```json
POST /api/counselor/reports/export
{
  "format": "pdf",
  "type": "weekly",
  "detailLevel": "summary"
}
```

参数：

- `format`：`pdf`/`excel`
- `type`：`weekly`/`monthly`/`custom`；`custom` 时需提供 `startDate`/`endDate`
- `detailLevel`：`summary`/`class`/`student`

响应返回下载 token：

```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/exports/eyJhbGciOiJ...",
    "expiresAt": "2026-06-29T10:00:00Z"
  }
}
```

## 上传（Upload）

路由：`api/src/domains/upload/upload.routes.ts`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/upload/cover` | 上传封面图 | admin/counselor |
| GET | `/upload/cover?path=...` | 读取封面图 | 公开 |
| POST | `/upload/attachment` | 上传通用附件 | admin/counselor |
| GET | `/upload/attachment?path=...` | 读取附件 | 公开 |

### 封面图上传示例

```bash
POST /api/upload/cover
Content-Type: multipart/form-data
Authorization: Bearer <token>

cover=<图片文件>
```

限制：≤5MB，jpg/png/webp。

详见 [`docs/UPLOAD-AND-STORAGE.md`](./UPLOAD-AND-STORAGE.md)。

## 导出文件下载

```
GET /api/exports/:token
```

公开访问，token 自包含文件 ID、格式、文件名和过期时间。下载后服务端尝试清理临时文件。

## 学习资料（Learning Resources）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/learning-resources` | 学习资料列表 | 登录 |
| GET | `/learning-resources/:id` | 学习资料详情 | 登录 |
| POST | `/learning-resources` | 创建学习资料 | admin |
| PUT | `/learning-resources/:id` | 更新学习资料 | admin |
| DELETE | `/learning-resources/:id` | 删除学习资料 | admin |

## 排行榜（Leaderboard）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/leaderboard` | 积分排行 | 登录 |

## 名言（Quotes）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/quotes/daily` | 每日名言 | 登录 |
| GET | `/quotes` | 名言列表 | admin |
| POST | `/quotes` | 创建名言 | admin |
| PUT | `/quotes/:id` | 更新名言 | admin |
| DELETE | `/quotes/:id` | 删除名言 | admin |

## 管理后台（Admin）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/admin/dashboard` | 管理后台仪表盘 | admin |
| GET | `/admin/audit-logs` | 审计日志 | admin |

## 错误码速查

| Code | 含义 | 常见场景 |
|---|---|---|
| `AUTH_UNAUTHORIZED` | 未认证 | 未登录或 token 过期 |
| `ACCESS_DENIED` | 无权限 | 角色不允许访问该资源 |
| `VALIDATION_ERROR` | 参数校验失败 | 必填字段缺失/格式错误 |
| `TASK_TEMPLATE_NOT_FOUND` | 模板不存在 | 模板 ID 错误 |
| `TASK_TEMPLATE_IN_USE` | 模板已被派发 | 删除模板时 |
| `TASK_NOT_FOUND` | 任务不存在或不可见 | 学生访问了非本范围任务 |
| `TASK_DEADLINE_PASSED` | 任务已截止 | 编辑/打卡时 |
| `UPLOAD_FILE_TOO_LARGE` | 文件过大 | 超过 5MB/20MB |
| `UPLOAD_INVALID_FILE` | 文件无效 | 上传请求格式错误 |
| `UPLOAD_INVALID_TYPE` | 文件类型不支持 | MIME/扩展名不合法 |
| `EXPORT_LINK_EXPIRED` | 导出链接过期 | 下载 token 失效或文件已清理 |
