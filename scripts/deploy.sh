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
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deploy/docker/docker-compose.yml"
MONITORING_COMPOSE_FILE="$PROJECT_ROOT/deploy/docker/docker-compose.monitoring.yml"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}LiqPro 部署脚本${NC}"
    echo -e "用法: $0 [选项]"
    echo -e "选项:"
    echo -e "  -e, --env ENV       指定环境 (staging 或 production, 默认: staging)"
    echo -e "  -t, --tag TAG       指定Docker镜像标签 (默认: latest)"
    echo -e "  -s, --skip-build    跳过构建步骤"
    echo -e "  -m, --with-monitoring  部署监控系统"
    echo -e "  -h, --help          显示帮助信息"
}

# 解析命令行参数
SKIP_BUILD=false
IMAGE_TAG="latest"
WITH_MONITORING=false

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -e|--env)
            ENVIRONMENT="$2"
            shift
            shift
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift
            shift
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -m|--with-monitoring)
            WITH_MONITORING=true
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

# 设置Docker Compose文件
if [[ "$ENVIRONMENT" == "production" ]]; then
    DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deploy/docker/docker-compose.prod.yml"
else
    DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deploy/docker/docker-compose.staging.yml"
fi

# 检查Docker Compose文件是否存在
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo -e "${RED}错误: Docker Compose配置文件不存在: $DOCKER_COMPOSE_FILE${NC}"
    exit 1
fi

# 显示部署信息
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       LiqPro 部署脚本 - $ENVIRONMENT       ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}环境:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Docker镜像标签:${NC} $IMAGE_TAG"
echo -e "${YELLOW}Docker Compose文件:${NC} $DOCKER_COMPOSE_FILE"
echo -e "${YELLOW}跳过构建:${NC} $SKIP_BUILD"
echo -e "${YELLOW}部署监控系统:${NC} $WITH_MONITORING"

# 确认部署
echo -e "\n${YELLOW}确认以上配置并继续部署? (y/n)${NC}"
read -r confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo -e "${RED}部署已取消${NC}"
    exit 0
fi

# 构建Docker镜像
if [ "$SKIP_BUILD" = false ]; then
    echo -e "\n${BLUE}正在构建Docker镜像...${NC}"
    cd "$PROJECT_ROOT" && bash scripts/build.sh --env "$ENVIRONMENT" --tag "$IMAGE_TAG"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}构建Docker镜像失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Docker镜像构建成功${NC}"
fi

# 部署应用
echo -e "\n${BLUE}正在部署应用...${NC}"
cd "$PROJECT_ROOT" && \
    TAG="$IMAGE_TAG" \
    ENVIRONMENT="$ENVIRONMENT" \
    docker-compose -f "$DOCKER_COMPOSE_FILE" down && \
    TAG="$IMAGE_TAG" \
    ENVIRONMENT="$ENVIRONMENT" \
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}部署应用失败${NC}"
    exit 1
fi

echo -e "${GREEN}应用部署成功${NC}"

# 部署监控系统
if [ "$WITH_MONITORING" = true ]; then
    echo -e "\n${BLUE}正在部署监控系统...${NC}"
    cd "$PROJECT_ROOT" && \
        TAG="$IMAGE_TAG" \
        ENVIRONMENT="$ENVIRONMENT" \
        docker-compose -f "$MONITORING_COMPOSE_FILE" down && \
        TAG="$IMAGE_TAG" \
        ENVIRONMENT="$ENVIRONMENT" \
        docker-compose -f "$MONITORING_COMPOSE_FILE" up -d
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}部署监控系统失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}监控系统部署成功${NC}"
fi

# 显示部署信息
echo -e "\n${BLUE}部署完成!${NC}"
echo -e "${YELLOW}环境:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Docker镜像标签:${NC} $IMAGE_TAG"

# 检查服务状态
echo -e "\n${BLUE}服务状态:${NC}"
cd "$PROJECT_ROOT" && \
    TAG="$IMAGE_TAG" \
    ENVIRONMENT="$ENVIRONMENT" \
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps

# 如果部署了监控系统，显示监控系统状态
if [ "$WITH_MONITORING" = true ]; then
    echo -e "\n${BLUE}监控系统状态:${NC}"
    cd "$PROJECT_ROOT" && \
        TAG="$IMAGE_TAG" \
        ENVIRONMENT="$ENVIRONMENT" \
        docker-compose -f "$MONITORING_COMPOSE_FILE" ps
fi

echo -e "\n${GREEN}部署完成!${NC}" 