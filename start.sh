#!/bin/bash

# LiqPro 启动脚本
echo "LiqPro 启动脚本"
echo "================="
echo "请选择要启动的环境:"
echo "1) 开发环境"
echo "2) 本地环境"
echo "3) 生产环境"
echo "q) 退出"
echo

read -p "请输入选项 [1-3 或 q]: " choice

case $choice in
  1)
    echo "启动开发环境..."
    ./deploy/start-dev.sh
    ;;
  2)
    echo "启动本地环境..."
    ./deploy/start-local.sh
    ;;
  3)
    echo "启动生产环境..."
    ./deploy/start-prod.sh
    ;;
  q|Q)
    echo "退出"
    exit 0
    ;;
  *)
    echo "无效选项"
    exit 1
    ;;
esac 