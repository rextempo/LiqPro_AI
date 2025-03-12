FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 复制项目根目录的package.json
COPY package*.json ./

# 复制libs目录
COPY libs/ ./libs/

# 复制services/agent-engine目录
COPY services/agent-engine/ ./services/agent-engine/

# 安装依赖并构建
RUN cd libs/common && npm install && npm run build && \
    cd ../database && npm install && npm run build && \
    cd ../security && npm install && npm run build && \
    cd ../../services/agent-engine && npm install && npm run build

# 设置工作目录
WORKDIR /app/services/agent-engine

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3004

# 暴露端口
EXPOSE 3004

# 启动服务
CMD ["npm", "start"] 