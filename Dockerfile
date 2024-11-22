# 使用 Node.js Alpine 作为基础镜像
FROM node:18-alpine

# 安装 git
RUN apk add --no-cache git

# 设置工作目录
WORKDIR /app

# 首先只复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 创建必要的目录
RUN mkdir -p /app/public /app/data

# 复制源代码和静态文件
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# 确保数据目录存在并可写
VOLUME ["/app/data"]

# 复制启动脚本并设置权限
COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["/start.sh"]
