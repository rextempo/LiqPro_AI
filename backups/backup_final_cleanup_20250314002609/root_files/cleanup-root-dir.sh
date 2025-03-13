#!/bin/bash

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/cleanup-root-dir-$(date +%Y%m%d%H%M%S).log"

# 日志函数
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a $LOG_FILE
}

# 创建备份
BACKUP_DIR="backup_root_cleanup_$(date +%Y%m%d%H%M%S)"
log "创建备份目录: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

# 备份根目录下的所有文件（排除目录和隐藏文件）
log "备份根目录下的文件..."
mkdir -p $BACKUP_DIR/root_files
find . -maxdepth 1 -type f -not -path "*/\.*" -exec cp {} $BACKUP_DIR/root_files/ \;
log "根目录文件备份完成"

# 1. 整理文档文件
log "整理文档文件..."
mkdir -p docs/solutions
mkdir -p docs/scripts
mkdir -p docs/configs

# 移动解决方案文档到docs/solutions
for file in *-solution.md liqpro-integration-summary.md meteora-fix-report.md VERSION-UNIFICATION.md; do
  if [ -f "$file" ]; then
    cp "$file" docs/solutions/
    log "已复制 $file 到 docs/solutions/"
  fi
done

# 移动配置文件到docs/configs
for file in *-env env-* *.env; do
  if [ -f "$file" ]; then
    cp "$file" docs/configs/
    log "已复制 $file 到 docs/configs/"
  fi
done

# 2. 删除不再需要的临时文件和脚本
log "删除不再需要的临时文件和脚本..."

# 需要删除的文件列表
FILES_TO_DELETE=(
  "add-rabbitmq-to-data-service.sh"
  "api-service-solution.md"
  "cleanup-old-services.sh"
  "cleanup-redundant-dirs.sh"
  "copy-to-container.sh"
  "data-service-env"
  "data-service-solution.md"
  "docker-compose-local-prod.yml"
  "docker-compose-local-prod.yml.bak.*"
  "docker-compose.production.yml"
  "docker-compose.yml.bak.*"
  "env-fixed"
  "env-js"
  "fix-api-service.sh"
  "fix-common.sh"
  "fix-meteora-direct.sh"
  "fix-meteora.sh"
  "fix_paths.sh"
  "install-types.sh"
  "liqpro-integration-summary.md"
  "meteora-fix-report.md"
  "package-js.json"
  "package-with-rabbitmq.json"
  "rabbitmq-integration.js"
  "rabbitmq-solution.md"
  "run-unification.sh"
  "server-fixed.js"
  "server-with-rabbitmq.js"
  "server-with-signal.js"
  "server.js"
  "service-status-report.md"
  "signal-service-fixed.js"
  "signal-service-package.json"
  "signal-service-solution.md"
  "signal-service.tar.gz"
  "start-signal-service.sh"
  "test-signal-generation.js"
  "unify-services.sh"
  "VERSION-UNIFICATION.md"
)

for file in "${FILES_TO_DELETE[@]}"; do
  if ls $file 1> /dev/null 2>&1; then
    rm -f $file
    log "已删除 $file"
  fi
done

# 3. 整理备份目录
log "整理备份目录..."
mkdir -p backups

# 移动所有备份目录到backups
for dir in backup_*; do
  if [ -d "$dir" ]; then
    mv "$dir" backups/
    log "已移动 $dir 到 backups/"
  fi
done

# 4. 删除冗余目录
log "删除冗余目录..."

# 需要删除的目录列表
DIRS_TO_DELETE=(
  "signal-service.js"
  "temp_fix"
)

for dir in "${DIRS_TO_DELETE[@]}"; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
    log "已删除目录 $dir"
  fi
done

# 5. 更新README.md
log "更新README.md..."
cat > README.md << 'EOF'
# LiqPro

LiqPro是基于Solana区块链的AI驱动自动化LP投资平台，帮助用户自动捕捉高质量LP投资机会并执行交易，创造被动收益。

## 项目结构

```
LiqPro/
├── services/              # 微服务目录
│   ├── api-service/       # API网关服务
│   ├── data-service/      # 数据收集和处理服务
│   ├── signal-service/    # 信号生成服务
│   ├── scoring-service/   # 风险评分服务
│   ├── agent-engine/      # 代理引擎服务
│   └── solana-cache/      # Solana区块链数据缓存服务
├── production/            # 生产环境配置和脚本
│   ├── config/            # 配置文件
│   ├── scripts/           # 管理脚本
│   ├── logs/              # 日志文件
│   ├── data/              # 数据文件
│   ├── backups/           # 备份文件
│   └── monitoring/        # 监控配置
├── frontend/              # 前端应用
├── libs/                  # 共享库
├── docs/                  # 文档
├── scripts/               # 开发和部署脚本
└── deploy/                # 部署配置
```

## 微服务

LiqPro平台包含以下微服务：

1. **API服务** (`api-service`) - API网关服务
2. **数据服务** (`data-service`) - 数据收集和处理服务
3. **信号服务** (`signal-service`) - 信号生成服务
4. **评分服务** (`scoring-service`) - 风险评分服务
5. **代理引擎** (`agent-engine`) - 代理引擎服务
6. **Solana缓存** (`solana-cache`) - Solana区块链数据缓存服务

## 开发环境

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

## 生产环境

### 初始配置

```bash
cd production
cp config/.env.template config/.env
vi config/.env
```

### 启动服务

```bash
cd production
./scripts/start.sh
```

### 监控服务

```bash
cd production
./scripts/monitor.sh
```

### 停止服务

```bash
cd production
./scripts/stop.sh
```

## 文档

详细文档请参阅 `docs` 目录。
EOF
log "已更新 README.md"

# 6. 创建.gitignore文件（如果不存在）
if [ ! -f ".gitignore" ]; then
  log "创建.gitignore文件..."
  cat > .gitignore << 'EOF'
# 依赖
node_modules/
.pnp
.pnp.js

# 构建输出
dist/
build/
*.tsbuildinfo

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 日志
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 编辑器
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# 测试
coverage/

# 缓存
.npm
.eslintcache

# 备份
backups/
backup_*/

# 临时文件
tmp/
temp/
.tmp/
.temp/
EOF
  log "已创建.gitignore文件"
fi

log "根目录清理和优化完成！"
log "备份已保存在 backups/$BACKUP_DIR 目录"
log "请检查日志文件 $LOG_FILE 了解详细信息" 