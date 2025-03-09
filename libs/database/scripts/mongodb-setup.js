// 启用分片
sh.enableSharding("liqpro");

// 创建索引
db.agent_metrics.createIndex({ "agentId": "hashed" });
db.agent_metrics.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 }); // 90天后过期
db.agent_metrics.createIndex({ "agentId": 1, "timestamp": -1 });

// 对agent_metrics集合进行分片
sh.shardCollection("liqpro.agent_metrics", { "agentId": "hashed" });

// 创建市场数据集合的索引
db.market_data.createIndex({ "poolAddress": 1, "timestamp": -1 });
db.market_data.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 }); // 30天后过期

// 对market_data集合进行分片
sh.shardCollection("liqpro.market_data", { "poolAddress": "hashed" });

// 创建信号数据集合的索引
db.signals.createIndex({ "agentId": 1, "timestamp": -1 });
db.signals.createIndex({ "poolAddress": 1, "timestamp": -1 });
db.signals.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 5184000 }); // 60天后过期

// 对signals集合进行分片
sh.shardCollection("liqpro.signals", { "agentId": "hashed" });

// 配置chunk大小（默认64MB）
use admin;
db.settings.updateOne(
   { _id: "chunksize" },
   { $set: { value: 64 } },
   { upsert: true }
); 