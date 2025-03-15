-- 初始数据库模式回滚脚本
-- 创建于: 2025-03-16
-- 描述: 回滚初始数据库结构的所有更改

-- 首先删除所有触发器
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_pools_last_update ON pools;
DROP TRIGGER IF EXISTS update_whale_activities_timestamp ON whale_activities;
DROP TRIGGER IF EXISTS update_strategy_decisions_timestamp ON strategy_decisions;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 按照依赖关系顺序删除表（从被引用最多的表开始）
DROP TABLE IF EXISTS strategy_decisions;
DROP TABLE IF EXISTS whale_activities;
DROP TABLE IF EXISTS agent_logs;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS pools;
DROP TABLE IF EXISTS users;

-- 删除扩展（如果不再需要）
-- DROP EXTENSION IF EXISTS btree_gist;
-- DROP EXTENSION IF EXISTS uuid-ossp; 