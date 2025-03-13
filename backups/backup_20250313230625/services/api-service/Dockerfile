FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制整个项目
COPY . .

# 安装和构建 common 库
WORKDIR /app/libs/common
RUN npm install
RUN npm run build

# 安装 API 服务依赖
WORKDIR /app/services/api-service
RUN npm install

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"] 