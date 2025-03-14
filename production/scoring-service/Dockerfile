FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm install
RUN npm install -g typescript
# 创建日志目录
RUN mkdir -p logs

# 复制源代码
COPY server.js ./
COPY src ./src/

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "server.js"] 