#!/bin/bash

# LiqPro 仓库清理和优化脚本
# 此脚本用于清理和优化 LiqPro 仓库，删除不必要的文件，整理目录结构

set -e
echo "开始清理和优化 LiqPro 仓库..."

# 创建备份
BACKUP_DIR="./backup_$(date +%Y%m%d_%H%M%S)"
echo "创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份重要文件
echo "备份重要文件..."
cp -r ./production "$BACKUP_DIR/"
cp README.md "$BACKUP_DIR/" 2>/dev/null || true
cp CHANGELOG.md "$BACKUP_DIR/" 2>/dev/null || true

# 清理临时文件和缓存
echo "清理临时文件和缓存..."
find . -name "*.log" -type f -delete
find . -name ".DS_Store" -type f -delete
find . -name "*.tmp" -type f -delete
find . -name "*.bak" -type f -delete
find . -name "*~" -type f -delete

# 清理重复的备份文件
echo "清理重复的备份文件..."
find . -name "*_backup_*" -type f | sort | head -n -5 | xargs rm -f 2>/dev/null || true
find . -name "*.backup" -type f | sort | head -n -5 | xargs rm -f 2>/dev/null || true

# 整理文档
echo "整理文档..."
mkdir -p ./docs
find . -name "*.md" -not -path "./production/*" -not -path "./docs/*" -not -path "./README.md" -not -path "./CHANGELOG.md" -exec mv {} ./docs/ \; 2>/dev/null || true

# 整理脚本
echo "整理脚本..."
mkdir -p ./scripts
find . -name "*.sh" -not -path "./production/*" -not -path "./scripts/*" -not -path "./cleanup-repo.sh" -exec mv {} ./scripts/ \; 2>/dev/null || true

# 整理环境文件
echo "整理环境文件..."
mkdir -p ./.env-files
find . -name ".env*" -not -path "./production/*" -not -path "./.env-files/*" -exec mv {} ./.env-files/ \; 2>/dev/null || true

# 清理不必要的 node_modules
echo "清理不必要的 node_modules..."
find . -name "node_modules" -type d -not -path "./production/*" -exec rm -rf {} \; 2>/dev/null || true

# 创建优化后的目录结构
echo "创建优化后的目录结构..."
mkdir -p ./src
mkdir -p ./deploy
mkdir -p ./tests

# 移动相关文件到适当的目录
echo "移动相关文件到适当的目录..."
find . -name "*.js" -not -path "./production/*" -not -path "./node_modules/*" -not -path "./src/*" -exec mv {} ./src/ \; 2>/dev/null || true
find . -name "*.ts" -not -path "./production/*" -not -path "./node_modules/*" -not -path "./src/*" -exec mv {} ./src/ \; 2>/dev/null || true
find . -name "*.json" -not -path "./production/*" -not -path "./node_modules/*" -not -path "./package.json" -not -path "./package-lock.json" -exec mv {} ./src/ \; 2>/dev/null || true

# 更新主 README.md
echo "更新主 README.md..."
cat > README.md << 'EOF'
# LiqPro 项目

LiqPro 是一个基于 Solana 区块链的 AI 驱动投资平台，专注于 Meteora DLMM 流动性池。

## 目录结构

```
LiqPro/
├── production/           # 生产环境配置和部署文件
├── src/                  # 源代码
├── docs/                 # 文档
├── scripts/              # 脚本
├── deploy/               # 部署配置
├── tests/                # 测试
└── .env-files/           # 环境变量配置
```

## 快速链接

- [生产环境](./production/README.md) - 生产环境配置和部署
- [文档](./docs/) - 项目文档
- [脚本](./scripts/) - 实用脚本

## 许可证

本项目为专有和机密项目。未经授权的复制、分发或使用是严格禁止的。
EOF

echo "清理和优化完成！"
echo "备份已保存到: $BACKUP_DIR"
echo "请检查更改并确认一切正常后再提交到版本控制系统。" 