# Agent Engine 集成测试

本目录包含Agent Engine的集成测试，用于验证系统在实际环境中的核心功能。

## 测试内容

集成测试主要验证以下方面：

1. **Solana交互**：测试与Solana区块链的基本交互，如获取余额、发送交易等。
2. **Meteora DLMM交互**：测试与Meteora DLMM协议的交互，如添加流动性、移除流动性、代币交换等。
3. **Agent Engine核心功能**：测试状态机、交易执行系统、资金管理模块等核心组件的集成。
4. **巡航模块功能**：测试策略执行、信号处理和自动交易等巡航功能。
5. **风险控制系统**：测试风险控制系统对状态变化的响应。

## 测试文件

- `SolanaIntegration.test.ts`: 测试与Solana区块链的基本交互
- `MeteoraIntegration.test.ts`: 测试与Meteora DLMM协议的交互
- `AgentEngine.test.ts`: 测试Agent Engine核心组件的集成
- `CruisingModule.test.ts`: 测试巡航模块的功能

## 运行测试

默认情况下，集成测试会被跳过，以避免在常规测试中使用真实的区块链交互。要运行集成测试，请使用以下命令：

```bash
# 运行所有集成测试
INTEGRATION_TEST=true npm test -- -t "Integration"

# 运行特定的集成测试
INTEGRATION_TEST=true npm test -- -t "Solana Integration"
INTEGRATION_TEST=true npm test -- -t "Meteora Integration"
INTEGRATION_TEST=true npm test -- -t "Agent Engine Integration"
INTEGRATION_TEST=true npm test -- -t "Cruising Module"
```

## 测试环境

- 测试默认使用Solana Devnet，以避免使用真实资金
- 测试钱包会自动生成，并通过水龙头获取测试SOL
- Meteora测试需要有效的池地址和代币地址

## 注意事项

- Devnet水龙头有频率限制，短时间内多次运行测试可能导致水龙头请求失败
- 对于Meteora测试，需要确保使用有效的池地址和代币地址
- 集成测试可能需要较长时间运行，特别是涉及区块链确认的测试

## 添加新的集成测试

添加新的集成测试时，请遵循以下准则：

1. 使用描述性的文件名，如`<Feature>Integration.test.ts`
2. 在测试文件开头添加`runIntegrationTests`检查，以便在非集成测试模式下跳过测试
3. 使用`beforeAll`和`afterAll`进行测试环境的设置和清理
4. 确保测试用例有清晰的断言，验证预期行为
5. 使用模拟（mock）来隔离外部依赖，但保留关键的集成点

## 安全考虑

- 永远不要在测试中使用包含真实资金的钱包
- 不要在测试代码中包含敏感信息
- 使用临时生成的测试钱包和测试网络

## 测试用例概述

### Solana集成测试
- 获取钱包余额
- 风险评估
- 创建并执行交易
- 风险控制响应

### Meteora集成测试
- 获取Meteora池信息
- 计算最优bin分布
- 添加流动性
- 移除流动性
- 代币交换
- 紧急退出

### Agent Engine集成测试
- 状态机状态转换
- 风险评估和处理
- 交易执行和队列管理
- 资金管理和安全检查
- 状态机事件监听
- 紧急退出机制

### 巡航模块集成测试
- 启动和停止巡航模块
- 执行策略
- 处理信号
- 信号订阅
- 自动交易执行
- 巡航模块与风险控制的集成
