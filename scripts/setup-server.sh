#!/bin/bash
set -e

echo "=== IdeoTrack 首次部署脚本 ==="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

# 安装 Git（如果未安装）
if ! command -v git &> /dev/null; then
    echo "安装 Git..."
    apt update && apt install git -y
fi

# 克隆代码
echo "克隆代码到 /opt/IdeoTrack..."
if [ -d "/opt/IdeoTrack" ]; then
    echo "目录已存在，跳过克隆"
    cd /opt/IdeoTrack
    git pull
else
    cd /opt
    git clone https://github.com/1797127235/IdeoTrack.git
    cd IdeoTrack
fi

# 创建环境变量文件
if [ ! -f ".env" ]; then
    echo "创建 .env 文件..."
    cat > .env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me-strong-password
POSTGRES_DB=ideo_track

CLIENT_URL=*
JWT_SECRET=change-me-to-random-string-at-least-32-characters
JWT_EXPIRES_IN=7d

WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_REMINDER_TEMPLATE_ID=
EOF
    echo "请编辑 /opt/IdeoTrack/.env 填入真实配置"
fi

# 修改 Caddyfile（使用 IP 访问）
echo "配置 Caddy..."
cat > Caddyfile << 'EOF'
:80 {
  reverse_proxy api:3000
}
EOF

# 启动服务
echo "启动服务..."
docker compose --profile with-caddy up -d --build

# 等待 PostgreSQL 就绪
echo "等待数据库就绪..."
sleep 15

# 执行数据库迁移
echo "执行数据库迁移..."
docker compose exec -T api node dist/scripts/migrate.js

# 填充测试数据
echo "填充测试数据..."
docker compose exec -T api node dist/scripts/seed.js

echo ""
echo "=== 部署完成 ==="
echo "API 地址: http://$(hostname -I | awk '{print $1}')"
echo "测试账号: 学生 2024001/024001, 辅导员 T001/T001, 管理员 A001/A001"
echo ""
echo "后续更新将通过 GitHub Actions 自动部署"
