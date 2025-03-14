#!/bin/bash

# 设置错误处理
set -e
echo "开始更新生产环境代码库..."

# 确保我们在项目根目录
cd "$(dirname "$0")"

# 备份当前状态
echo "备份当前状态..."
BACKUP_DIR="backups/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r production $BACKUP_DIR/
cp docker-compose.yml $BACKUP_DIR/
cp VERSION.md $BACKUP_DIR/

# 确保我们在最新的代码上
echo "获取最新代码..."
git fetch origin

# 切换到main分支
echo "切换到main分支..."
git checkout main

# 确保main分支是最新的
echo "更新main分支..."
git pull origin main

# 如果当前不在production-unified分支上，先合并main到production-unified
if [ "$(git branch --show-current)" != "production-unified" ]; then
    echo "合并main到production-unified分支..."
    git checkout production-unified
    git merge main --no-edit
fi

# 确保production-unified分支包含所有最新更改
echo "确保production-unified分支是最新的..."
git pull origin production-unified || true

# 合并production-unified到main
echo "合并production-unified到main分支..."
git checkout main
git merge production-unified --no-edit

# 更新VERSION.md
echo "更新版本信息..."
CURRENT_DATE=$(date +%Y-%m-%d)
VERSION_CONTENT="# LiqPro 版本记录\n\n## 当前版本: 生产环境-统一版本 ($CURRENT_DATE)\n\n### 主要更改\n1. **统一代码库**\n   - 合并所有分支到main\n   - 清理冗余文件和配置\n   - 建立单一的生产环境版本\n\n2. **优化部署流程**\n   - 简化docker-compose配置\n   - 标准化环境变量\n   - 改进服务间通信\n\n### 系统状态\n- 所有服务使用统一的配置和依赖\n- 简化的部署和维护流程\n- 清晰的版本控制和追踪\n\n### 下一步计划\n1. 持续优化系统架构\n2. 改进监控和日志系统\n3. 增强系统稳定性和性能"

echo -e "$VERSION_CONTENT" > VERSION.md

# 提交更改
echo "提交更改..."
git add VERSION.md
git commit -m "统一生产环境版本 ($CURRENT_DATE)" || true

# 推送到远程仓库
echo "推送到远程仓库..."
git push origin main

echo "生产环境代码库更新完成！" 