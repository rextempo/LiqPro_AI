#!/bin/bash

# LiqPro DLMM集成测试 - 使用模拟服务

# 设置颜色
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # 无颜色

# 默认配置
TEST_DURATION=${1:-30} # 默认测试时间为30秒
LOG_LEVEL=${2:-"INFO"} # 默认日志级别为INFO

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}  LiqPro DLMM 池集成测试 - 使用模拟服务执行脚本${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}测试持续时间: ${TEST_DURATION} 秒${NC}"
echo -e "${YELLOW}日志级别: ${LOG_LEVEL}${NC}"
echo -e "${GREEN}=====================================================${NC}"

# 确保在集成测试目录中
cd $(dirname $0)

# 安装依赖
echo -e "${YELLOW}检查并安装必要依赖...${NC}"
npm_packages="axios @solana/web3.js express cors"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}安装测试依赖: ${npm_packages}${NC}"
  npm install $npm_packages
fi

# 设置环境变量
export TEST_DURATION=$TEST_DURATION
export LOG_LEVEL=$LOG_LEVEL
export SOLANA_RPC_URL="https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/"

# 设置模拟服务端口（使用随机端口避免冲突）
export MOCK_DATA_SERVICE_PORT=$((3001 + RANDOM % 1000))
export MOCK_SIGNAL_SERVICE_PORT=$((4001 + RANDOM % 1000))
export MOCK_SCORING_SERVICE_PORT=$((5001 + RANDOM % 1000))

# 导出环境变量供测试使用
export DATA_SERVICE_URL="http://localhost:$MOCK_DATA_SERVICE_PORT"
export SIGNAL_SERVICE_URL="http://localhost:$MOCK_SIGNAL_SERVICE_PORT"
export SCORING_SERVICE_URL="http://localhost:$MOCK_SCORING_SERVICE_PORT"

echo -e "${YELLOW}模拟服务配置:${NC}"
echo -e "  数据服务: $DATA_SERVICE_URL"
echo -e "  信号服务: $SIGNAL_SERVICE_URL"
echo -e "  评分服务: $SCORING_SERVICE_URL"

# 启动模拟服务
echo -e "${YELLOW}启动模拟服务...${NC}"
node mock_services.js &
MOCK_PID=$!

# 确保脚本退出时关闭模拟服务
function cleanup {
  echo -e "${YELLOW}正在关闭模拟服务 (PID: $MOCK_PID)...${NC}"
  kill -15 $MOCK_PID 2>/dev/null
  wait $MOCK_PID 2>/dev/null
  echo -e "${YELLOW}清理完成${NC}"
}
trap cleanup EXIT

# 等待模拟服务启动
echo -e "${YELLOW}等待模拟服务启动...${NC}"
sleep 2

# 检查模拟服务是否正常运行
echo -e "${YELLOW}检查模拟服务状态...${NC}"
data_health_check=$(curl -s $DATA_SERVICE_URL/health || echo "failed")
signal_health_check=$(curl -s $SIGNAL_SERVICE_URL/health || echo "failed")
scoring_health_check=$(curl -s $SCORING_SERVICE_URL/health || echo "failed")

if [[ $data_health_check == *"failed"* || $signal_health_check == *"failed"* || $scoring_health_check == *"failed"* ]]; then
  echo -e "${RED}模拟服务启动失败${NC}"
  exit 1
fi

echo -e "${GREEN}模拟服务启动成功${NC}"

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