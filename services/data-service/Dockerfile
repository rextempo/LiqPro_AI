FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 复制项目根目录的package.json
COPY package*.json ./

# 复制libs目录
COPY libs/ ./libs/

# 复制services/data-service目录
COPY services/data-service/ ./services/data-service/

# 安装依赖并构建
RUN cd libs/common && npm install && npm run build && \
    cd ../database && npm install && npm run build && \
    cd ../security && npm install && npm run build && \
    cd ../../services/data-service && npm install && npm run build

# 设置工作目录
WORKDIR /app/services/data-service

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"] 