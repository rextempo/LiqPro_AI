#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 默认环境和标签
ENVIRONMENT="staging"
IMAGE_TAG="latest"
REGISTRY=""
PUSH=false

# 显示帮助信息
show_help() {
    echo -e "${BLUE}LiqPro 构建脚本${NC}"
    echo -e "用法: $0 [选项]"
    echo -e "选项:"
    echo -e "  -e, --env ENV       指定环境 (staging 或 production, 默认: staging)"
    echo -e "  -t, --tag TAG       指定Docker镜像标签 (默认: latest)"
    echo -e "  -r, --registry URL  指定Docker镜像仓库URL"
    echo -e "  -p, --push          构建后推送镜像到仓库"
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
        -t|--tag)
            IMAGE_TAG="$2"
            shift
            shift
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift
            shift
            ;;
        -p|--push)
            PUSH=true
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

# 显示构建信息
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       LiqPro 构建脚本 - $ENVIRONMENT       ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}环境:${NC} $ENVIRONMENT"
echo -e "${YELLOW}Docker镜像标签:${NC} $IMAGE_TAG"
if [ -n "$REGISTRY" ]; then
    echo -e "${YELLOW}Docker镜像仓库:${NC} $REGISTRY"
fi
echo -e "${YELLOW}推送镜像:${NC} $PUSH"

# 确认构建
echo -e "\n${YELLOW}确认以上配置并继续构建? (y/n)${NC}"
read -r confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo -e "${RED}构建已取消${NC}"
    exit 0
fi

# 构建前准备
echo -e "\n${BLUE}正在准备构建环境...${NC}"

# 安装依赖
echo -e "\n${BLUE}正在安装依赖...${NC}"
cd "$PROJECT_ROOT" && npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}安装依赖失败${NC}"
    exit 1
fi

# 运行测试
echo -e "\n${BLUE}正在运行测试...${NC}"
cd "$PROJECT_ROOT" && npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}测试失败${NC}"
    echo -e "${YELLOW}是否继续构建? (y/n)${NC}"
    read -r continue_build
    if [[ "$continue_build" != "y" && "$continue_build" != "Y" ]]; then
        echo -e "${RED}构建已取消${NC}"
        exit 1
    fi
fi

# 构建TypeScript代码
echo -e "\n${BLUE}正在编译TypeScript代码...${NC}"
cd "$PROJECT_ROOT" && npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}编译TypeScript代码失败${NC}"
    exit 1
fi

# 构建Docker镜像
echo -e "\n${BLUE}正在构建Docker镜像...${NC}"

# 服务列表
SERVICES=(
    "api-service"
    "data-service"
    "signal-service"
    "scoring-service"
    "agent-engine"
)

# 构建每个服务的Docker镜像
for service in "${SERVICES[@]}"; do
    echo -e "\n${BLUE}正在构建 $service 镜像...${NC}"
    
    # 设置镜像名称
    if [ -n "$REGISTRY" ]; then
        IMAGE_NAME="$REGISTRY/liqpro-$service:$IMAGE_TAG"
    else
        IMAGE_NAME="liqpro-$service:$IMAGE_TAG"
    fi
    
    # 构建镜像
    cd "$PROJECT_ROOT" && \
        docker build \
            --build-arg NODE_ENV="$ENVIRONMENT" \
            -t "$IMAGE_NAME" \
            -f "services/$service/Dockerfile" \
            "services/$service"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}构建 $service 镜像失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}$service 镜像构建成功: $IMAGE_NAME${NC}"
    
    # 如果需要，推送镜像到仓库
    if [ "$PUSH" = true ] && [ -n "$REGISTRY" ]; then
        echo -e "${BLUE}正在推送 $service 镜像到仓库...${NC}"
        docker push "$IMAGE_NAME"
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}推送 $service 镜像失败${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}$service 镜像推送成功${NC}"
    fi
done

echo -e "\n${GREEN}所有Docker镜像构建成功!${NC}"

# 如果是生产环境，创建版本标记文件
if [ "$ENVIRONMENT" = "production" ]; then
    VERSION=$(node -e "console.log(require('$PROJECT_ROOT/package.json').version)")
    echo -e "\n${BLUE}创建版本标记文件 (v$VERSION)...${NC}"
    echo "{\"version\":\"$VERSION\",\"environment\":\"$ENVIRONMENT\",\"buildTime\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$PROJECT_ROOT/build-info.json"
    echo -e "${GREEN}版本标记文件创建成功${NC}"
fi

echo -e "\n${GREEN}构建完成!${NC}" 