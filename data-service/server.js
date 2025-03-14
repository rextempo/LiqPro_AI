const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'data-service'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`数据服务运行在端口 ${PORT}`);
}); 