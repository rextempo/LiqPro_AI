#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deploy/docker/docker-compose.dev.yml"

# 显示标题
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       LiqPro 开发环境启动脚本        ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker未安装。请先安装Docker。${NC}"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose未安装。请先安装Docker Compose。${NC}"
    exit 1
fi

# 检查Docker是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker未运行。请先启动Docker。${NC}"
    exit 1
fi

# 检查docker-compose文件是否存在
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo -e "${RED}错误: Docker Compose配置文件不存在: $DOCKER_COMPOSE_FILE${NC}"
    exit 1
fi

# 显示菜单
show_menu() {
    echo -e "\n${YELLOW}请选择操作:${NC}"
    echo -e "1) ${GREEN}启动所有服务${NC}"
    echo -e "2) ${GREEN}停止所有服务${NC}"
    echo -e "3) ${GREEN}重启所有服务${NC}"
    echo -e "4) ${GREEN}查看服务状态${NC}"
    echo -e "5) ${GREEN}查看服务日志${NC}"
    echo -e "6) ${GREEN}重建并启动所有服务${NC}"
    echo -e "0) ${RED}退出${NC}"
    echo -n -e "${YELLOW}请输入选项 [0-6]: ${NC}"
    read -r option
}

# 启动所有服务
start_services() {
    echo -e "\n${BLUE}正在启动所有服务...${NC}"
    cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}所有服务已成功启动!${NC}"
        show_service_urls
    else
        echo -e "${RED}启动服务时出错。请检查日志。${NC}"
    fi
}

# 停止所有服务
stop_services() {
    echo -e "\n${BLUE}正在停止所有服务...${NC}"
    cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" down
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}所有服务已停止!${NC}"
    else
        echo -e "${RED}停止服务时出错。${NC}"
    fi
}

# 重启所有服务
restart_services() {
    echo -e "\n${BLUE}正在重启所有服务...${NC}"
    cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" restart
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}所有服务已重启!${NC}"
        show_service_urls
    else
        echo -e "${RED}重启服务时出错。${NC}"
    fi
}

# 查看服务状态
check_status() {
    echo -e "\n${BLUE}服务状态:${NC}"
    cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" ps
}

# 查看服务日志
view_logs() {
    echo -e "\n${YELLOW}请选择要查看日志的服务:${NC}"
    echo -e "1) ${GREEN}所有服务${NC}"
    echo -e "2) ${GREEN}API服务${NC}"
    echo -e "3) ${GREEN}信号服务${NC}"
    echo -e "4) ${GREEN}数据服务${NC}"
    echo -e "5) ${GREEN}评分服务${NC}"
    echo -e "6) ${GREEN}Agent引擎${NC}"
    echo -e "0) ${RED}返回${NC}"
    echo -n -e "${YELLOW}请输入选项 [0-6]: ${NC}"
    read -r log_option

    case $log_option in
        1)
            cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f
            ;;
        2)
            cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f api-service
            ;;
        3)
            cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f signal-service
            ;;
        4)
            cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f data-service
            ;;
        5)
            cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f scoring-service
            ;;
        6)
            cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 -f agent-engine
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}无效选项!${NC}"
            ;;
    esac
}

# 重建并启动所有服务
rebuild_services() {
    echo -e "\n${BLUE}正在重建并启动所有服务...${NC}"
    cd "$PROJECT_ROOT" && docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}所有服务已重建并启动!${NC}"
        show_service_urls
    else
        echo -e "${RED}重建服务时出错。请检查日志。${NC}"
    fi
}

# 显示服务URL
show_service_urls() {
    echo -e "\n${BLUE}服务访问地址:${NC}"
    echo -e "${GREEN}API服务:${NC} http://localhost:3000"
    echo -e "${GREEN}信号服务:${NC} http://localhost:3002"
    echo -e "${GREEN}数据服务:${NC} http://localhost:3001"
    echo -e "${GREEN}评分服务:${NC} http://localhost:3003"
    echo -e "${GREEN}Agent引擎:${NC} http://localhost:3004"
    echo -e "${GREEN}Redis:${NC} localhost:6379"
    echo -e "${GREEN}MongoDB:${NC} mongodb://admin:secret@localhost:27017"
    echo -e "${GREEN}PostgreSQL:${NC} postgresql://admin:secret@localhost:5432/liqpro"
}

# 主循环
while true; do
    show_menu
    case $option in
        1)
            start_services
            ;;
        2)
            stop_services
            ;;
        3)
            restart_services
            ;;
        4)
            check_status
            ;;
        5)
            view_logs
            ;;
        6)
            rebuild_services
            ;;
        0)
            echo -e "\n${BLUE}感谢使用LiqPro开发环境启动脚本!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选项!${NC}"
            ;;
    esac
done 