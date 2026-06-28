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
```

## 关键表结构

| 表 | 说明 | 关键字段 |
|---|---|---|
| `colleges` | 学院 | `id`, `name`（唯一） |
| `classes` | 班级 | `id`, `college_id`, `name`，唯一约束 `(college_id, name)` |
| `users` | 所有角色账号 | `school_id`（唯一）, `role`, `college_id`, `class_id`, `password_hash`, `wechat_openid`, `is_enabled` |
| `counselor_classes` | 辅导员↔所带班级 | `counselor_id`, `class_id`，唯一约束 `(counselor_id, class_id)` |
| `task_templates` | 任务模板库 | `title`, `content`, `guiding_questions`, `geo_*`, `require_face`, `status` |
| `tasks` | 思政任务实例 | `scope_type`, `scope_id`/`target_college_id`/`target_class_id`, `template_id`, `geo_*`（签到范围） |
| `check_ins` | 打卡记录 | `user_id`, `task_id`, `status`, `reflection_content`, `geo_*` |
| `user_faces` | 注册照 + 人脸向量 | `user_id`, `photo_path`, `embedding` |

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

- 管理员在 Web 后台维护**任务模板库**（`task_templates`），只保存内容、思考题、签到要求等快照，不指定发布范围。
- 辅导员在小程序从模板库选择模板，发布为所辖班级的**任务实例**（`tasks`，`scope_type='class'`）。
- 管理员也可以直接将模板发布为全校/全院任务，或绕过模板直接创建任务实例。
- 任务实例的 `template_id` 指向来源模板；直接创建的实例 `template_id` 为 NULL。

## 任务签到范围

管理员在 Web 后台创建/编辑任务模板或任务实例时，可用高德地图划定签到范围（点 + 半径），学生在小程序签到时必须处于该范围内。

- Web 地图组件：`web/components/GeofencePicker.tsx`
- 后端距离校验：`api/src/domains/checkins/checkins.service.ts`、`api/src/domains/tasks/task.utils.ts`

## 人脸模块（可选）

注册照 + 人脸比对依赖独立的 FastAPI 微服务（InsightFace）。未配置 `FACE_SERVICE_URL` 时降级：管理员仍可上传/保存原图，但不提向量、不做人脸校验。

- 微服务：`face-service/`
- 配置：`FACE_SERVICE_URL`、`FACE_PHOTO_DIR`
- 部署说明：[`docs/FACE-TEST-DEPLOY.md`](./FACE-TEST-DEPLOY.md)
