#!/bin/bash

# 进入common库目录
cd /Users/rex/Documents/LiqPro/production/libs/common

# 删除node_modules目录，重新安装依赖
rm -rf node_modules
npm install
npm install --save-dev @types/node

# 构建common库
npm run build

echo "Common库已修复" 