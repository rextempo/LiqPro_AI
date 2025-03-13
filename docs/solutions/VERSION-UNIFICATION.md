# LiqPro 微服务版本统一

本文档描述了 LiqPro 平台微服务版本统一的过程和结果。

## 背景

LiqPro 平台原有多个微服务，存在以下问题：

1. 服务版本重复：同一服务存在多个不同版本
   - Signal Service 存在原始版和 Fixed 版
   - Data Service 存在原始版和 Real 版
2. 目录结构混乱：服务分散在不同目录
   - 部分服务在 `services/` 目录
   - 部分服务在 `production/services/` 目录
   - 部分服务在根目录
3. 配置不一致：不同服务使用不同的配置方式
4. 依赖版本不一致：不同服务使用不同版本的依赖

## 版本统一方案

我们采用以下方案进行版本统一：

1. 保留最新版本的服务：
   - Signal Service: 使用 `signal-service-fixed`（最新修改于 3月13日 10:55 AM）
   - Data Service: 使用 `services/data-service-real`（最新修改于 3月13日 11:03 AM）
   - API Service: 使用 `production/services/api-service`
   - Scoring Service: 使用 `production/services/scoring-service`
   - Agent Engine: 使用 `production/services/agent-engine`
   - Solana Cache: 使用 `services/solana-cache`

2. 统一目录结构：
   - 所有服务统一放在 `services/` 目录下
   - 每个服务有自己的子目录

3. 统一配置：
   - 所有服务使用统一的环境变量命名
   - 统一 Docker 配置

4. 统一版本号：
   - 所有服务版本号统一为 1.0.0

## 执行步骤

我们提供了三个脚本来执行版本统一过程：

1. `unify-services.sh`：
   - 创建备份
   - 复制最新版本的服务到 `unified_services/` 目录
   - 统一版本号
   - 创建新的 docker-compose.yml

2. `cleanup-old-services.sh`：
   - 删除旧版本的服务
   - 将统一版本移动到 `services/` 目录
   - 更新 docker-compose.yml

3. `run-unification.sh`：
   - 执行整个版本统一过程
   - 提供交互式确认
   - 可选择是否立即启动服务

## 执行方法

```bash
# 给脚本添加执行权限
chmod +x run-unification.sh

# 执行版本统一
./run-unification.sh
```

## 统一后的服务

统一后，LiqPro 平台包含以下微服务：

1. **API Service** - API 网关服务
   - 端口：3001
   - 依赖：MongoDB, RabbitMQ

2. **Data Service** - 数据收集和处理服务
   - 端口：3002
   - 依赖：MongoDB, RabbitMQ
   - 特点：集成 Meteora DLMM 协议

3. **Signal Service** - 信号生成服务
   - 端口：3003
   - 依赖：RabbitMQ
   - 特点：改进的信号生成逻辑

4. **Scoring Service** - 风险评分服务
   - 端口：3004
   - 依赖：MongoDB, RabbitMQ

5. **Agent Engine** - 代理引擎服务
   - 端口：3005
   - 依赖：MongoDB, RabbitMQ, Data Service, Signal Service, Scoring Service

6. **Solana Cache** - Solana 区块链数据缓存服务
   - 端口：3006
   - 依赖：MongoDB

## 注意事项

1. 版本统一过程会创建备份，备份目录为 `backup_YYYYMMDDHHMMSS/`
2. 如果执行过程中出现错误，可以从备份恢复
3. 统一后的服务配置可能需要根据实际环境进行调整

## 后续工作

1. 更新部署文档
2. 更新监控配置
3. 进行全面测试，确保所有服务正常工作
4. 考虑进一步优化服务间依赖关系 