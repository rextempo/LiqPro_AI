#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 默认环境
ENVIRONMENT="staging"
ENV_FILE=".env.staging"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}LiqPro 环境设置脚本${NC}"
    echo -e "用法: $0 [选项]"
    echo -e "选项:"
    echo -e "  -e, --env ENV       指定环境 (staging 或 production, 默认: staging)"
    echo -e "  -f, --file FILE     指定环境变量文件 (默认: .env.staging 或 .env.production)"
    echo -e "  -h, --help          显示帮助信息"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -e|--env)
            ENVIRONMENT="$2"
            shift
            shift
            ;;
        -f|--file)
            ENV_FILE="$2"
            shift
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 验证环境
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}错误: 环境必须是 'staging' 或 'production'${NC}"
    exit 1
fi

# 如果未指定环境变量文件，则使用默认文件
if [[ "$ENV_FILE" == ".env.staging" && "$ENVIRONMENT" == "production" ]]; then
    ENV_FILE=".env.production"
fi

# 显示设置信息
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       LiqPro 环境设置 - $ENVIRONMENT       ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}环境:${NC} $ENVIRONMENT"
echo -e "${YELLOW}环境变量文件:${NC} $ENV_FILE"

# 检查环境变量文件是否存在
if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    echo -e "${YELLOW}环境变量文件不存在，将创建新文件${NC}"
    touch "$PROJECT_ROOT/$ENV_FILE"
fi

# 生成随机密码和密钥
generate_random_string() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$1"
}

# 设置环境变量
echo -e "\n${BLUE}设置环境变量...${NC}"

# 读取现有环境变量
if [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
    source "$PROJECT_ROOT/$ENV_FILE"
fi

# 设置RabbitMQ凭据
if [ -z "${RABBITMQ_USER}" ]; then
    RABBITMQ_USER="admin"
    echo "RABBITMQ_USER=$RABBITMQ_USER" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 RABBITMQ_USER=${NC} $RABBITMQ_USER"
fi

if [ -z "${RABBITMQ_PASSWORD}" ]; then
    RABBITMQ_PASSWORD=$(generate_random_string 16)
    echo "RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 RABBITMQ_PASSWORD=${NC} $RABBITMQ_PASSWORD"
fi

# 设置API密钥
if [ -z "${API_KEY}" ]; then
    API_KEY=$(generate_random_string 32)
    echo "API_KEY=$API_KEY" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 API_KEY=${NC} $API_KEY"
fi

# 设置JWT密钥
if [ -z "${JWT_SECRET}" ]; then
    JWT_SECRET=$(generate_random_string 64)
    echo "JWT_SECRET=$JWT_SECRET" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 JWT_SECRET=${NC} $JWT_SECRET"
fi

# 设置日志级别
if [ -z "${LOG_LEVEL}" ]; then
    if [ "$ENVIRONMENT" == "production" ]; then
        LOG_LEVEL="info"
    else
        LOG_LEVEL="debug"
    fi
    echo "LOG_LEVEL=$LOG_LEVEL" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 LOG_LEVEL=${NC} $LOG_LEVEL"
fi

# 设置Solana RPC URL
if [ -z "${SOLANA_RPC_URL}" ]; then
    if [ "$ENVIRONMENT" == "production" ]; then
        SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
    else
        SOLANA_RPC_URL="https://api.devnet.solana.com"
    fi
    echo "SOLANA_RPC_URL=$SOLANA_RPC_URL" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 SOLANA_RPC_URL=${NC} $SOLANA_RPC_URL"
fi

# 提示设置Solana RPC API密钥
if [ -z "${SOLANA_RPC_API_KEY}" ]; then
    echo -e "\n${YELLOW}请输入Solana RPC API密钥 (如果没有，请留空):${NC}"
    read -r SOLANA_RPC_API_KEY
    if [ -n "$SOLANA_RPC_API_KEY" ]; then
        echo "SOLANA_RPC_API_KEY=$SOLANA_RPC_API_KEY" >> "$PROJECT_ROOT/$ENV_FILE"
        echo -e "${GREEN}已设置 SOLANA_RPC_API_KEY${NC}"
    fi
fi

# 如果是生产环境，提示设置钱包私钥
if [ "$ENVIRONMENT" == "production" ] && [ -z "${WALLET_PRIVATE_KEY}" ]; then
    echo -e "\n${YELLOW}请输入钱包私钥 (如果没有，请留空):${NC}"
    read -r WALLET_PRIVATE_KEY
    if [ -n "$WALLET_PRIVATE_KEY" ]; then
        echo "WALLET_PRIVATE_KEY=$WALLET_PRIVATE_KEY" >> "$PROJECT_ROOT/$ENV_FILE"
        echo -e "${GREEN}已设置 WALLET_PRIVATE_KEY${NC}"
    fi
fi

# 设置Docker镜像仓库
if [ -z "${REGISTRY}" ]; then
    echo -e "\n${YELLOW}请输入Docker镜像仓库URL (如果没有，请留空):${NC}"
    read -r REGISTRY
    if [ -n "$REGISTRY" ]; then
        # 确保URL以斜杠结尾
        [[ "$REGISTRY" != */ ]] && REGISTRY="$REGISTRY/"
        echo "REGISTRY=$REGISTRY" >> "$PROJECT_ROOT/$ENV_FILE"
        echo -e "${GREEN}已设置 REGISTRY=${NC} $REGISTRY"
    fi
fi

# 设置Docker镜像标签
if [ -z "${TAG}" ]; then
    if [ "$ENVIRONMENT" == "production" ]; then
        TAG="latest"
    else
        TAG="develop"
    fi
    echo "TAG=$TAG" >> "$PROJECT_ROOT/$ENV_FILE"
    echo -e "${GREEN}已设置 TAG=${NC} $TAG"
fi

echo -e "\n${GREEN}环境变量设置完成!${NC}"
echo -e "${BLUE}环境变量文件:${NC} $PROJECT_ROOT/$ENV_FILE"

# 创建.env文件的软链接
ln -sf "$PROJECT_ROOT/$ENV_FILE" "$PROJECT_ROOT/.env"
echo -e "${GREEN}已创建 .env 软链接${NC}"

echo -e "\n${BLUE}环境设置完成!${NC}"
echo -e "${YELLOW}您现在可以使用以下命令部署应用:${NC}"
echo -e "  bash scripts/deploy.sh --env $ENVIRONMENT" 