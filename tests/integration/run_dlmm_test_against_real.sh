#!/bin/bash

# LiqPro DLMM集成测试 - 连接真实服务

# 设置颜色
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # 无颜色

# 默认配置
TEST_DURATION=${1:-60} # 默认测试时间为1分钟
LOG_LEVEL=${2:-"INFO"} # 默认日志级别为INFO
DATA_SERVICE=${3:-"http://localhost:3001"}
SIGNAL_SERVICE=${4:-"http://localhost:3002"}
SCORING_SERVICE=${5:-"http://localhost:3003"}

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}      LiqPro DLMM 池集成测试 - 真实服务${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}测试持续时间: ${TEST_DURATION} 秒${NC}"
echo -e "${YELLOW}日志级别: ${LOG_LEVEL}${NC}"
echo -e "${GREEN}=====================================================${NC}"

# 确保在集成测试目录中
cd $(dirname $0)

# 确保日志目录存在
mkdir -p logs

# 设置环境变量
export TEST_DURATION=$TEST_DURATION
export LOG_LEVEL=$LOG_LEVEL
export SOLANA_RPC_URL="https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/"
export DATA_SERVICE_URL="$DATA_SERVICE"
export SIGNAL_SERVICE_URL="$SIGNAL_SERVICE"
export SCORING_SERVICE_URL="$SCORING_SERVICE"

echo -e "${YELLOW}服务配置:${NC}"
echo -e "  数据服务: $DATA_SERVICE_URL"
echo -e "  信号服务: $SIGNAL_SERVICE_URL"
echo -e "  评分服务: $SCORING_SERVICE_URL"

# 检查服务是否可用
echo -e "${YELLOW}检查服务可用性...${NC}"

check_service() {
  local service_name=$1
  local service_url=$2
  echo -e "  检查 $service_name: $service_url/health"
  local result=$(curl -s -o /dev/null -w "%{http_code}" $service_url/health)
  if [ "$result" == "200" ]; then
    echo -e "  ${GREEN}$service_name 可用${NC}"
    return 0
  else
    echo -e "  ${RED}$service_name 不可用 (HTTP 状态码: $result)${NC}"
    return 1
  fi
}

# 检查所有服务是否可用
data_service_available=$(check_service "数据服务" "$DATA_SERVICE_URL")
signal_service_available=$(check_service "信号服务" "$SIGNAL_SERVICE_URL")
scoring_service_available=$(check_service "评分服务" "$SCORING_SERVICE_URL")

# 如果任何服务不可用，提供选项
if [[ $data_service_available -ne 0 || $signal_service_available -ne 0 || $scoring_service_available -ne 0 ]]; then
  echo -e "${RED}警告: 一个或多个服务不可用${NC}"
  echo -e "${YELLOW}选择操作:${NC}"
  echo -e "  1) 继续测试 (可能会失败)"
  echo -e "  2) 启动模拟服务进行测试"
  echo -e "  3) 取消测试"
  
  read -p "请选择 [1-3]: " choice
  
  case $choice in
    1)
      echo -e "${YELLOW}继续测试，但部分服务不可用...${NC}"
      ;;
    2)
      echo -e "${YELLOW}使用模拟服务进行测试...${NC}"
      ./run_with_mock.sh $TEST_DURATION $LOG_LEVEL
      exit $?
      ;;
    *)
      echo -e "${RED}测试取消${NC}"
      exit 1
      ;;
  esac
fi

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