// 为 Jest 测试环境添加 crypto.getRandomValues 实现
const crypto = require('crypto');

// 在 Node.js 环境中，global.self 不存在，所以我们只需要设置 global.crypto
if (!global.crypto) {
  global.crypto = {
    getRandomValues: function(arr) {
      return crypto.randomBytes(arr.length).copy(arr);
    }
  };
} 