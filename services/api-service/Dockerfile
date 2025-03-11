FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY services/api-service/package*.json ./services/api-service/
RUN cd services/api-service && npm install

# 复制源代码
COPY services/api-service ./services/api-service

# 设置工作目录
WORKDIR /app/services/api-service

# 编译TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "run", "start"] 