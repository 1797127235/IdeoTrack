# IdeoTrack Mobile

思政打卡 App 移动端，基于 React Native + Expo。

## 环境准备

1. 安装依赖：`npm install`
2. 配置 API 地址：在 `app.json` 或 `.env` 中设置 `EXPO_PUBLIC_API_URL`
3. 启动：`npx expo start`

## 项目结构

```
mobile/
├── app/
│   ├── _layout.tsx        # 根布局
│   ├── index.tsx          # 启动页（根据登录状态跳转）
│   ├── (auth)/login.tsx   # 登录页
│   ├── (student)/         # 学生端
│   ├── (counselor)/       # 辅导员端
│   └── (admin)/           # 管理员端
├── services/api.ts        # API 客户端
└── theme.ts               # 设计令牌
```

## Story 1.1 实现范围

- 登录页 UI
- 调用 `/api/auth/login`
- SecureStore 存储 token
- 根据角色跳转到对应首页
