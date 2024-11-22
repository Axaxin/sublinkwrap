#!/bin/sh

# 如果目录不存在则克隆，否则拉取最新代码
if [ ! -d "/app/.git" ]; then
    echo "Cloning repository..."
    git clone https://github.com/Axaxin/sublinkwrap.git /tmp/repo
    cp -r /tmp/repo/* /app/
    cp -r /tmp/repo/.git /app/
    rm -rf /tmp/repo
else
    echo "Pulling latest changes..."
    cd /app && git pull
fi

# 安装依赖
echo "Installing dependencies..."
npm install --production

# 启动应用
echo "Starting application..."
node src/index.js
