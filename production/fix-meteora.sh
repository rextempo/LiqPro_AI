#!/bin/bash

# 创建必要的目录
mkdir -p services/data-service/src/meteora

# 复制meteora相关文件
cp src/meteora.js services/data-service/src/meteora/
cp src/meteora.d.ts services/data-service/src/meteora/
cp src/meteora-example.js services/data-service/src/meteora/ 2>/dev/null || :
cp src/meteora-example.d.ts services/data-service/src/meteora/ 2>/dev/null || :

# 安装必要的依赖
cd services/data-service
npm install --save-dev @types/node

# 构建项目
npm run build

echo "Meteora文件已复制并构建完成" 