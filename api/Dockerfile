# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
# 跳过可选依赖，避免跨平台 lock 文件缺少特定架构的 native binding（如 rolldown/vitest）
# 用 npm install 而不是 npm ci，避免 Windows 生成的 lock 在 Linux 构建时不一致
RUN npm install --omit=optional

COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# 安装 Chromium 与中文字体，供 puppeteer-core 生成 PDF 报告使用
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
# 生产环境同样跳过可选依赖，避免 lock 文件跨平台缺失 native binding
RUN npm install --omit=dev --omit=optional

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
