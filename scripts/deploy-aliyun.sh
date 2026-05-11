#!/bin/bash
# GuanDan4 阿里云 ECS 一键部署脚本
# SSH 登录 ECS 后运行: bash deploy-aliyun.sh

set -e

echo "=== 1. 安装 Node.js 22 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node --version), npm: $(npm --version)"

echo "=== 2. 安装 Git ==="
apt-get install -y git 2>/dev/null || true

echo "=== 3. 克隆项目 ==="
cd /opt
[ -d guandan4 ] && (cd guandan4 && git pull) || git clone https://github.com/ge8034/guandan4.git
cd guandan4

echo "=== 4. 环境变量 ==="
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://rzzywltxlfgucngfiznx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enl3bHR4bGZndWNuZ2Zpem54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTM1NjksImV4cCI6MjA4NDYyOTU2OX0.Upn1XmBZPQxYPl2UAVpGOtWim3Pf3yeeGNNMQm0idtM
ENVEOF

echo "=== 5. 安装依赖 + 构建 ==="
npm install
npm run build

echo "=== 6. 安装 PM2 ==="
npm install -g pm2

echo "=== 7. 启动服务 ==="
pm2 delete guandan4 2>/dev/null || true
pm2 start npm --name guandan4 -- start -- -p 3000
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "=== 部署完成 ==="
echo "访问: http://8.136.23.108:3000"
echo "状态: pm2 status"
echo "日志: pm2 logs guandan4"
