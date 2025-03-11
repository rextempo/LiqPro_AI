# Agent Engine 集成测试

本目录包含与实际链上交互的集成测试，用于验证 Agent Engine 的核心功能在真实环境中的表现。

## 测试内容

集成测试涵盖以下方面：

1. **Solana 基础交互**：验证与 Solana 区块链的基本交互，包括获取余额、发送交易等。
2. **Meteora DLMM 交互**：验证与 Meteora DLMM 协议的交互，包括获取池信息、添加/移除流动性、交换代币等。
3. **风险控制系统**：验证风险控制系统在实际链上状态变化时的响应。

## 运行测试

由于集成测试需要与实际区块链交互，默认情况下这些测试会被跳过。要运行集成测试，请使用以下命令：

```bash
# 运行所有集成测试
INTEGRATION_TEST=true npm test -- -t "Integration"

# 仅运行 Solana 集成测试
INTEGRATION_TEST=true npm test -- -t "Solana Integration"

# 仅运行 Meteora 集成测试
INTEGRATION_TEST=true npm test -- -t "Meteora Integration"
```

## 测试环境

集成测试默认使用 Solana 开发网络（Devnet）进行测试，这样可以避免在主网上消耗真实资金。测试过程中会自动请求空投 SOL 到测试钱包。

如果需要在其他网络上进行测试，请修改测试文件中的 `SOLANA_DEVNET_URL` 常量。

## 注意事项

1. **测试钱包**：测试会自动生成临时钱包，无需提供实际钱包。
2. **空投限制**：Devnet 上的空投有频率限制，如果测试失败，可能需要等待一段时间再重试。
3. **Meteora 测试**：Meteora DLMM 测试需要有效的池地址和代币地址，当前使用的是占位符。在实际测试中，需要更新 `METEORA_TEST_CONFIG` 中的配置。
4. **依赖要求**：运行 Meteora 测试需要安装 `@meteora-ag/dlmm` 包。

## 扩展测试

要添加新的集成测试，请遵循以下步骤：

1. 在 `integration` 目录下创建新的测试文件，命名格式为 `<Feature>Integration.test.ts`。
2. 导入必要的依赖和工具类。
3. 使用 `runIntegrationTests` 标志来控制测试是否执行。
4. 在 `beforeAll` 中设置测试环境，在 `afterAll` 中清理资源。
5. 实现测试用例，确保每个测试都有明确的断言。

## 安全考虑

集成测试涉及到实际的区块链交互，请注意以下安全事项：

1. 永远不要在测试中使用包含实际资金的钱包。
2. 不要在主网上运行测试，除非你完全了解其影响。
3. 测试代码中不应包含任何私钥或敏感信息。
4. 限制测试交易的金额，避免意外消耗过多资金。
