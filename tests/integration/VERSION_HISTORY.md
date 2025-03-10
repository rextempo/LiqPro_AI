# LiqPro DLMM 池集成测试系统版本历史

本文档记录 LiqPro DLMM 池集成测试系统的版本历史，便于追踪变更和在需要时回滚到特定版本。

## 版本命名规则

本项目采用语义化版本号（[Semantic Versioning](https://semver.org/)）进行版本管理:

- **主版本号 (MAJOR)**: 当进行不兼容的 API 更改时增加
- **次版本号 (MINOR)**: 当以向后兼容的方式添加功能时增加
- **修订号 (PATCH)**: 当进行向后兼容的错误修复时增加

每个版本在 Git 中使用 `v{主版本号}.{次版本号}.{修订号}-dlmm-test` 格式的标签标记。

## 版本历史

### v1.0.0 (2024-03-11)

**Git 标签**: `v1.0.0-dlmm-test`

**核心功能**:

- 基于 Meteora DLMM 池的完整集成测试系统
- 模拟服务支持，提供稳定的测试环境
- 实际服务连接能力，支持真实环境测试
- 详细的测试报告和日志记录
- 指标收集和分析功能

**主要组件**:

- `dlmm_test.js` - 主测试脚本
- `logger.js` - 增强的日志记录工具
- `mock_services.js` - 模拟服务器
- `collect_metrics.js` - 测试指标收集工具
- 各种执行脚本 (`run_with_mock.sh`, `run_dlmm_test_against_real.sh` 等)
- 完整的测试文档 (`DLMM_INTEGRATION_TEST_GUIDE.md`)

**如何回滚到此版本**:

```bash
git checkout v1.0.0-dlmm-test
```

或者恢复特定文件:

```bash
git checkout v1.0.0-dlmm-test -- tests/integration/
```
