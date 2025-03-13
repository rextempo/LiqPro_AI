#!/bin/bash

# LiqPro 生产环境清理和优化脚本
# 此脚本用于清理和优化 LiqPro 生产环境目录，删除不必要的文件，整理目录结构

set -e
echo "开始清理和优化 LiqPro 生产环境目录..."

# 创建备份
BACKUP_DIR="./backup_$(date +%Y%m%d_%H%M%S)"
echo "创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份重要文件
echo "备份重要文件..."
cp -r ./services "$BACKUP_DIR/"
cp -r ./frontend "$BACKUP_DIR/"
cp -r ./scripts "$BACKUP_DIR/" 2>/dev/null || true
cp -r ./deploy "$BACKUP_DIR/" 2>/dev/null || true
cp -r ./docs "$BACKUP_DIR/" 2>/dev/null || true
cp docker-compose-local-prod.yml "$BACKUP_DIR/" 2>/dev/null || true
cp simple-auth-server.js "$BACKUP_DIR/" 2>/dev/null || true
cp README.md "$BACKUP_DIR/" 2>/dev/null || true
cp PRODUCTION.md "$BACKUP_DIR/" 2>/dev/null || true
cp LiqPro本地生产环境部署方案.md "$BACKUP_DIR/" 2>/dev/null || true

# 清理临时文件和缓存
echo "清理临时文件和缓存..."
find . -name "*.log" -type f -delete
find . -name ".DS_Store" -type f -delete
find . -name "*.tmp" -type f -delete
find . -name "*.bak" -type f -delete
find . -name "*~" -type f -delete

# 清理旧的备份文件
echo "清理旧的备份文件..."
find . -name "mongodb_backup_*" -type d | sort | head -n -5 | xargs rm -rf 2>/dev/null || true
find . -name "*_backup_*" -type f | sort | head -n -5 | xargs rm -f 2>/dev/null || true
find . -name "*.backup" -type f | sort | head -n -5 | xargs rm -f 2>/dev/null || true

# 整理环境文件
echo "整理环境文件..."
mkdir -p ./.env-files
find . -name ".env*" -not -path "./.env-files/*" -exec mv {} ./.env-files/ \; 2>/dev/null || true

# 整理脚本
echo "整理脚本..."
mkdir -p ./scripts
find . -name "*.sh" -not -path "./scripts/*" -not -path "./cleanup-production.sh" -exec mv {} ./scripts/ \; 2>/dev/null || true

# 整理文档
echo "整理文档..."
mkdir -p ./docs
find . -name "*.md" -not -path "./docs/*" -not -path "./README.md" -not -path "./PRODUCTION.md" -not -path "./LiqPro本地生产环境部署方案.md" -exec mv {} ./docs/ \; 2>/dev/null || true

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p ./data/mongodb
mkdir -p ./data/redis
mkdir -p ./data/rabbitmq
mkdir -p ./logs
mkdir -p ./temp

# 创建启动脚本
echo "创建启动脚本..."
cat > ./scripts/start-local-production.sh << 'EOF'
#!/bin/bash

# LiqPro 本地生产环境启动脚本

set -e
echo "启动 LiqPro 本地生产环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo "错误: Docker 未运行，请先启动 Docker"
  exit 1
fi

# 创建必要的目录
mkdir -p ./data/mongodb
mkdir -p ./data/redis
mkdir -p ./data/rabbitmq
mkdir -p ./logs
mkdir -p ./temp

# 启动服务
echo "启动 Docker 容器..."
docker-compose -f docker-compose-local-prod.yml up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose -f docker-compose-local-prod.yml ps

echo "LiqPro 本地生产环境已启动"
echo "访问前端: http://localhost:3000"
echo "访问 API: http://localhost:3001/api"
echo "查看日志: docker-compose -f docker-compose-local-prod.yml logs -f"
EOF
chmod +x ./scripts/start-local-production.sh

# 创建停止脚本
echo "创建停止脚本..."
cat > ./scripts/stop-local-production.sh << 'EOF'
#!/bin/bash

# LiqPro 本地生产环境停止脚本

set -e
echo "停止 LiqPro 本地生产环境..."

# 停止服务
docker-compose -f docker-compose-local-prod.yml down

echo "LiqPro 本地生产环境已停止"
EOF
chmod +x ./scripts/stop-local-production.sh

# 创建备份脚本
echo "创建备份脚本..."
cat > ./scripts/backup-local-prod.sh << 'EOF'
#!/bin/bash

# LiqPro 本地生产环境数据备份脚本

set -e
BACKUP_DIR="./mongodb_backup_$(date +%Y%m%d_%H%M%S)"
echo "创建 MongoDB 备份: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份 MongoDB 数据
echo "备份 MongoDB 数据..."
docker exec -it production-mongodb-1 mongodump --out=/data/backup

# 复制备份到主机
echo "复制备份到主机..."
docker cp production-mongodb-1:/data/backup "$BACKUP_DIR"

echo "备份完成: $BACKUP_DIR"
EOF
chmod +x ./scripts/backup-local-prod.sh

# 创建监控脚本
echo "创建监控脚本..."
cat > ./scripts/monitor-local-prod.sh << 'EOF'
#!/bin/bash

# LiqPro 本地生产环境监控脚本

set -e
echo "监控 LiqPro 本地生产环境..."

# 检查容器状态
echo "容器状态:"
docker-compose -f docker-compose-local-prod.yml ps

# 检查资源使用情况
echo -e "\n资源使用情况:"
docker stats --no-stream $(docker-compose -f docker-compose-local-prod.yml ps -q)

# 检查日志
echo -e "\n最近日志:"
docker-compose -f docker-compose-local-prod.yml logs --tail=20
EOF
chmod +x ./scripts/monitor-local-prod.sh

echo "清理和优化完成！"
echo "备份已保存到: $BACKUP_DIR"
echo "请检查更改并确认一切正常后再提交到版本控制系统。" 