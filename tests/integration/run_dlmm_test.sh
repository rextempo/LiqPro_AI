#!/bin/bash

# LiqPro DLMM集成测试执行脚本

# 设置颜色
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # 无颜色

# 默认配置
TEST_DURATION=${1:-60} # 默认测试时间为1分钟
LOG_LEVEL=${2:-"INFO"} # 默认日志级别为INFO

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}      LiqPro DLMM 池集成测试 - 执行脚本${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}测试持续时间: ${TEST_DURATION} 秒${NC}"
echo -e "${YELLOW}日志级别: ${LOG_LEVEL}${NC}"
echo -e "${GREEN}=====================================================${NC}"

# 确保日志目录存在
mkdir -p tests/integration/logs

# 安装依赖
echo -e "${YELLOW}检查并安装必要依赖...${NC}"
cd tests/integration
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}安装测试依赖...${NC}"
  npm install axios @solana/web3.js
fi

# 设置环境变量
export TEST_DURATION=$TEST_DURATION
export LOG_LEVEL=$LOG_LEVEL
export SOLANA_RPC_URL="https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/"
export DATA_SERVICE_URL=${DATA_SERVICE_URL:-"http://localhost:3001"}
export SIGNAL_SERVICE_URL=${SIGNAL_SERVICE_URL:-"http://localhost:3002"}
export SCORING_SERVICE_URL=${SCORING_SERVICE_URL:-"http://localhost:3003"}

echo -e "${YELLOW}使用以下环境配置:${NC}"
echo -e "  SOLANA_RPC_URL: $SOLANA_RPC_URL"
echo -e "  DATA_SERVICE_URL: $DATA_SERVICE_URL"
echo -e "  SIGNAL_SERVICE_URL: $SIGNAL_SERVICE_URL"
echo -e "  SCORING_SERVICE_URL: $SCORING_SERVICE_URL"

# 运行测试
echo -e "${GREEN}开始执行DLMM集成测试...${NC}"
node dlmm_test.js

# 检查测试结果
TEST_RESULT=$?
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "${GREEN}测试执行完成，总体结果: 成功${NC}"
  echo -e "${GREEN}=====================================================${NC}"
else
  echo -e "${RED}=====================================================${NC}"
  echo -e "${RED}测试执行完成，总体结果: 失败 (退出码: $TEST_RESULT)${NC}"
  echo -e "${RED}=====================================================${NC}"
fi

# 显示日志位置
echo -e "${YELLOW}详细日志保存在: $(pwd)/logs/ 目录下${NC}"

# 返回测试结果
exit $TEST_RESULT 