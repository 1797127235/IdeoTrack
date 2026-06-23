# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
# 跳过可选依赖，避免跨平台 lock 文件缺少特定架构的 native binding（如 rolldown/vitest）
RUN npm ci --omit=optional

COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# 生产环境同样跳过可选依赖，避免 lock 文件跨平台缺失 native binding
RUN npm ci --omit=dev --omit=optional

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
