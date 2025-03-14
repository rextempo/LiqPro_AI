#!/bin/bash

# LiqPro 统一启动脚本
echo "LiqPro 启动脚本"
echo "================="
echo "请选择模式:"
echo "1) 开发模式 (热更新 + 真实数据)"
echo "2) 生产模式"
echo "q) 退出"
echo

read -p "请输入选项 [1-2 或 q]: " choice

case $choice in
  1)
    echo "启动开发模式..."
    cd unified-config && ./start.sh dev
    ;;
  2)
    echo "启动生产模式..."
    cd unified-config && ./start.sh prod
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