---
story_id: 4.5
story_key: 4-5-di-li-wei-lan
epic: 4
epic_title: 学生打卡流程
status: ready-for-dev
priority: high
points: 13
---

# Story 4.5: 地理围栏校验与配置

Status: ready-for-dev

> 来源：Epic 4 Story 4.5 / PRD FR-9 / Architecture AD-1, AD-5, AD-14, AD-20
> 新增：sprint-change-proposal-2026-06-24-v3 — 地理围栏纳入 MVP（AD-20）
> 修订：集成高德地图服务，管理员可在地图上配置围栏

## Story

**作为** 学校管理员，
**我想要** 在 Web 后台通过地图配置地理围栏（学校/教学楼/班级范围），
**以便** 学生只能在指定区域内完成打卡，防止异地代签。

**作为** 学生，
**我想要** 在签到时知道是否在围栏范围内，
**以便** 了解签到是否成功。

> **高德地图集成**：
> - 前端：高德地图 JavaScript API（地图显示、圆形绘制、位置选择）
> - 后端：高德地图 Web服务 API（地理编码、逆地理编码）
> - 围栏校验：Haversine 距离计算

## Acceptance Criteria

### AC-1: 围栏配置 API（管理员）

- **Given** 管理员在 Web 后台配置围栏
- **When** 调用围栏配置 API
- **Then** 管理员可创建、查看、编辑、删除围栏
- **And** 围栏包含：名称、中心点经纬度、半径、作用域类型、作用域 ID
- **And** 围栏坐标统一 gcj02 体系（高德地图坐标系）

### AC-2: 围栏配置 UI（管理员）

- **Given** 管理员在 Web 后台
- **When** 进入围栏配置页面
- **Then** 展示高德地图，管理员可在地图上点击选择围栏中心点
- **And** 支持搜索地址（如「教学楼A」）自动定位到地图
- **And** 可调整围栏半径（滑块或输入框），地图上实时显示圆形覆盖区域
- **And** 选择作用域类型（school/building/class）和具体作用域
- **And** 保存后围栏在地图上持续显示

### AC-3: 围栏列表与编辑

- **Given** 管理员在围栏配置页面
- **When** 查看围栏列表
- **Then** 展示所有已配置围栏（名称、位置、半径、作用域）
- **And** 点击围栏可编辑或删除
- **And** 编辑时地图定位到该围栏位置

### AC-4: 签到时围栏校验

- **Given** 学生在任务详情页点击「立即打卡」
- **When** 后端获取位置后判定是否命中适用围栏
- **Then** 命中围栏：正常创建/更新打卡记录（复用 Story 4.1 逻辑）
- **And** 未命中任一适用围栏：拒绝打卡，返回 `CHECKIN_OUTSIDE_GEOFENCE`

### AC-5: 围栏作用域匹配

- **Given** 系统有多个围栏配置
- **When** 校验学生位置
- **Then** 按作用域匹配：school 全局适用、building 按教学楼、class 按班级（AD-14 范围）
- **And** 命中任一适用围栏即通过

### AC-6: 小程序错误态展示

- **Given** 学生签到未命中围栏
- **When** 后端返回 `CHECKIN_OUTSIDE_GEOFENCE`
- **Then** 小程序展示「当前不在签到范围内，请到指定地点打卡」（UX-13 文字+图标）

### AC-7: 权限控制

- **Given** 管理员/辅导员查看围栏配置
- **When** 访问围栏 API
- **Then** 仅管理员可配置围栏（增删改）
- **And** 辅导员只读（查看）

## Tasks / Subtasks

### 后端任务

- [ ] **Task 1: 围栏数据库表与迁移** (AC: #1)
  - [ ] 1.1 创建 `geofences` 表：id UUID PK, name TEXT, center_lat DECIMAL, center_lng DECIMAL, radius_meters INTEGER, scope_type TEXT CHECK (school/building/class), scope_id UUID, created_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
  - [ ] 1.2 添加索引：idx_geofences_scope

- [ ] **Task 2: 围栏配置 API** (AC: #1, #7)
  - [ ] 2.1 实现 `POST /api/geofences`（管理员权限）
  - [ ] 2.2 实现 `GET /api/geofences`（管理员/辅导员权限）
  - [ ] 2.3 实现 `PUT /api/geofences/:id`（管理员权限）
  - [ ] 2.4 实现 `DELETE /api/geofences/:id`（管理员权限）
  - [ ] 2.5 校验必填字段：name, center_lat, center_lng, radius_meters, scope_type
  - [ ] 2.6 校验 scope_id（school 时为 NULL，building/class 时必填）

- [ ] **Task 3: 高德地图地理编码 API** (AC: #2)
  - [ ] 3.1 实现 `GET /api/geocode/search`（地址转坐标）
  - [ ] 3.2 调用高德地图地理编码 API：https://restapi.amap.com/v3/geocode/geo
  - [ ] 3.3 返回经纬度和地址描述
  - [ ] 3.4 实现 `GET /api/geocode/regeo`（坐标转地址）
  - [ ] 3.5 调用高德地图逆地理编码 API：https://restapi.amap.com/v3/geocode/regeo
  - [ ] 3.6 返回地址描述

- [ ] **Task 4: 围栏校验服务** (AC: #4, #5)
  - [ ] 4.1 实现 Haversine 距离计算函数
  - [ ] 4.2 实现 `checkGeofence(userId, latitude, longitude)` 函数
  - [ ] 4.3 查询适用围栏（按 scope_type 匹配用户班级/学院/学校）
  - [ ] 4.4 校验是否命中任一围栏
  - [ ] 4.5 未命中返回 `CHECKIN_OUTSIDE_GEOFENCE` 错误

- [ ] **Task 5: 集成到签到流程** (AC: #4)
  - [ ] 5.1 更新 `checkins.createOrUpdateCheckIn` 函数
  - [ ] 5.2 在落库前调用 `checkGeofence`
  - [ ] 5.3 未命中时拒绝签到并返回错误

### Web 后台任务（管理员）

- [ ] **Task 6: 围栏配置页面** (AC: #2, #3)
  - [ ] 6.1 创建 `web/app/(admin)/geofences/page.tsx`
  - [ ] 6.2 集成高德地图 JavaScript API
  - [ ] 6.3 实现地图显示和交互
  - [ ] 6.4 实现地址搜索功能（调用后端地理编码 API）
  - [ ] 6.5 实现点击地图选择围栏中心点
  - [ ] 6.6 实现围栏半径滑块，地图上实时显示圆形覆盖区域
  - [ ] 6.7 实现围栏列表展示
  - [ ] 6.8 实现编辑围栏功能（地图定位到该围栏）
  - [ ] 6.9 实现删除围栏功能（确认对话框）
  - [ ] 6.10 遵循 DESIGN.md 配色规范

### 小程序任务（学生）

- [ ] **Task 7: 错误态展示** (AC: #6)
  - [ ] 7.1 更新签到结果页面
  - [ ] 7.2 处理 `CHECKIN_OUTSIDE_GEOFENCE` 错误码
  - [ ] 7.3 展示「当前不在签到范围内，请到指定地点打卡」
  - [ ] 7.4 添加图标和重试按钮
  - [ ] 7.5 遵循 DESIGN.md 配色规范

## Dev Notes

### 高德地图集成方案

#### 前端（JavaScript API）

```typescript
// 初始化地图
const map = new AMap.Map('container', {
  zoom: 15,
  center: [116.397428, 39.90923] // 默认中心点
});

// 创建圆形围栏
const circle = new AMap.Circle({
  center: [116.397428, 39.90923], // 圆心
  radius: 500, // 半径（米）
  strokeColor: '#0891B2',
  strokeWeight: 2,
  fillColor: '#0891B2',
  fillOpacity: 0.2
});
map.add(circle);

// 点击地图选择位置
map.on('click', (e) => {
  const { lng, lat } = e.lnglat;
  circle.setCenter([lng, lat]);
  // 更新表单经纬度
});

// 地址搜索
async function searchAddress(keyword: string) {
  const res = await fetch(`/api/geocode/search?address=${keyword}`);
  const data = await res.json();
  if (data.geocodes.length > 0) {
    const { lng, lat } = data.geocodes[0].location;
    map.setCenter([lng, lat]);
    circle.setCenter([lng, lat]);
  }
}
```

#### 后端（Web服务 API）

```typescript
// 地理编码（地址转坐标）
async function geocode(address: string) {
  const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${AMAP_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === '1' && data.geocodes.length > 0) {
    const [lng, lat] = data.geocodes[0].location.split(',').map(Number);
    return { lng, lat, formatted_address: data.geocodes[0].formatted_address };
  }
  return null;
}

// 逆地理编码（坐标转地址）
async function reverseGeocode(lng: number, lat: number) {
  const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${AMAP_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === '1') {
    return data.regeocode.formatted_address;
  }
  return null;
}
```

### 围栏校验逻辑

```typescript
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function checkGeofence(
  userId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  // 1. 获取用户班级/学院信息
  const userScope = await getUserScope(userId);
  
  // 2. 查询适用围栏
  const geofences = await query(
    `SELECT * FROM geofences 
     WHERE scope_type = 'school' 
        OR (scope_type = 'building' AND scope_id = $1)
        OR (scope_type = 'class' AND scope_id = $2)`,
    [userScope.building_id, userScope.class_id]
  );
  
  // 3. 检查是否命中任一围栏
  for (const fence of geofences) {
    const distance = haversineDistance(
      latitude, longitude,
      fence.center_lat, fence.center_lng
    );
    if (distance <= fence.radius_meters) {
      return true; // 命中
    }
  }
  
  return false; // 未命中
}
```

### 数据库 Schema

```sql
-- 地理围栏表
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- 围栏名称（如「学校全域」「主教学楼」）
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL CHECK (radius_meters > 0),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('school', 'building', 'class')),
  scope_id UUID,  -- school 时为 NULL，building 时为 building_id，class 时为 class_id
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofences_scope ON geofences(scope_type, scope_id);
```

### 环境变量配置

```env
# 高德地图 API Key
AMAP_KEY=your_amap_web_service_key
AMAP_JS_KEY=your_amap_javascript_key
```

### 项目结构

```
ideo-track/
├── api/
│   └── src/
│       └── domains/
│           ├── geofences/
│           │   ├── geofences.controller.ts
│           │   ├── geofences.service.ts
│           │   ├── geofences.routes.ts
│           │   └── geofences.types.ts
│           ├── geocode/
│           │   ├── geocode.controller.ts
│           │   ├── geocode.service.ts
│           │   └── geocode.routes.ts
│           └── checkins/
│               └── checkins.service.ts  # 添加 checkGeofence 函数
├── web/
│   └── app/
│       └── (admin)/
│           └── geofences/
│               └── page.tsx            # 围栏配置页面（集成高德地图）
├── miniprogram/
│   └── pages/
│       └── checkin/
│           └── result/
│               └── index.ts            # 处理 CHECKIN_OUTSIDE_GEOFENCE 错误
```

## UX Requirements

### 围栏配置页面（Web）

- 地图占页面 60% 宽度，右侧为配置面板
- 搜索框在地图上方，支持地址搜索
- 点击地图后显示标记点，圆形围栏实时显示
- 半径滑块范围：50m - 5000m，默认 500m
- 围栏列表在右侧面板，支持编辑/删除
- 遵循 DESIGN.md：背景 `#ECFEFF`、主色 `#0891B2`、CTA `#22C55E`

### 小程序错误态

- 展示「当前不在签到范围内，请到指定地点打卡」
- 使用警告图标（⚠️ 或 🚫）
- 文字颜色：`#EF4444`（错误红）
- 背景色：`#FEF2F2`（浅红）
- 提供「重试」按钮
- 按钮样式：`#0891B2`（主色）

## Testing Requirements

### 后端测试

- [ ] **单元测试**：Haversine 距离计算、围栏校验逻辑、地理编码 API 调用
- [ ] **集成测试**：
  - 管理员创建围栏 → 成功
  - 管理员编辑围栏 → 成功
  - 管理员删除围栏 → 成功
  - 学生在围栏内签到 → 成功
  - 学生在围栏外签到 → 返回 CHECKIN_OUTSIDE_GEOFENCE
  - 多个围栏匹配 → 命中任一即通过

### 前端测试

- [ ] **组件测试**：地图显示、圆形绘制、地址搜索
- [ ] **功能测试**：点击地图选择位置、调整半径、保存围栏

## Dev Agent Record

### Agent Model Used

(待填写)

### Debug Log

(待填写)

### Completion Notes

(待填写)

## File List

(待填写)

## Change Log

- 2026-06-24: 创建故事文件，基于 sprint-change-proposal-2026-06-24-v3
- 2026-06-24: 重新设计，集成高德地图服务
