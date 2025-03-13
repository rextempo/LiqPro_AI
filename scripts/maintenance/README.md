# 维护脚本

本目录包含用于LiqPro平台维护和优化的脚本。

## 脚本列表

1. **final-cleanup.sh** - 最终清理脚本，用于删除根目录中不必要的文件，保留必要的配置和文档。
   - 使用方法: `npm run cleanup` 或 `./scripts/maintenance/final-cleanup.sh`

2. **cleanup-root-dir.sh** - 根目录清理脚本，用于整理文档文件、删除临时文件和脚本、整理备份目录等。
   - 使用方法: `./scripts/maintenance/cleanup-root-dir.sh`

3. **optimize-prod-structure.sh** - 生产环境目录结构优化脚本，用于创建标准化的生产环境目录结构。
   - 使用方法: `./scripts/maintenance/optimize-prod-structure.sh`

## 注意事项

- 所有脚本执行前会自动创建备份，备份文件保存在 `backups/` 目录下
- 脚本执行过程中的日志会保存在 `logs/` 目录下
- 执行脚本前请确保已经备份重要数据 