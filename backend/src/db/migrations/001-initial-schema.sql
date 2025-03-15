-- 初始数据库模式
-- 创建于: 2025-03-16
-- 描述: LiqPro项目的核心数据表结构

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- 用于范围和排他约束

-- Users表（用户表）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(64) UNIQUE NOT NULL,
  nonce VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Agents表（投资代理表）
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'paused', 'stopped')),
  strategy VARCHAR(20) NOT NULL CHECK (strategy IN ('conservative', 'balanced', 'aggressive')),
  deposit_amount DECIMAL(20, 9) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  current_value DECIMAL(20, 9) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  profit_loss DECIMAL(20, 9) NOT NULL DEFAULT 0,
  available_balance DECIMAL(20, 9) DEFAULT 0 CHECK (available_balance >= 0),
  positions_limit INT DEFAULT 3 CHECK (positions_limit BETWEEN 1 AND 10),
  reserved_balance DECIMAL(20, 9) DEFAULT 0.2 CHECK (reserved_balance BETWEEN 0 AND 1),
  strategy_params JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 添加复合约束
  CONSTRAINT check_balance_consistency CHECK (available_balance <= current_value),
  CONSTRAINT check_reserved_balance CHECK (reserved_balance * current_value <= available_balance)
);

-- Pools表（流动性池表）
CREATE TABLE pools (
  address VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  token_x_mint VARCHAR(64) NOT NULL,
  token_x_symbol VARCHAR(10) NOT NULL,
  token_x_decimals INT NOT NULL,
  token_y_mint VARCHAR(64) NOT NULL,
  token_y_symbol VARCHAR(10) NOT NULL,
  token_y_decimals INT NOT NULL,
  bin_step INT NOT NULL,
  base_fee DECIMAL(5, 2) NOT NULL,
  max_fee DECIMAL(5, 2) NOT NULL,
  current_price DECIMAL(30, 15) NOT NULL,
  total_liquidity DECIMAL(30, 9) NOT NULL,
  volume_24h DECIMAL(30, 9) NOT NULL DEFAULT 0,
  fees_24h DECIMAL(30, 9) NOT NULL DEFAULT 0,
  fees_tvl_ratio DECIMAL(10, 6) NOT NULL DEFAULT 0,
  apr DECIMAL(10, 6) NOT NULL DEFAULT 0,
  volume_change_24h DECIMAL(10, 6) DEFAULT 0,
  liquidity_change_24h DECIMAL(10, 6) DEFAULT 0,
  liquidity_concentration DECIMAL(5, 4) DEFAULT 0,
  activity_score DECIMAL(2, 1) DEFAULT 3.0,
  risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
  whale_activity_level VARCHAR(10) DEFAULT 'low' CHECK (whale_activity_level IN ('low', 'medium', 'high')),
  
  -- 价格历史相关字段
  token_a_price_30d_high DECIMAL(30, 15),
  token_a_price_30d_low DECIMAL(30, 15),
  token_a_price_30d_avg DECIMAL(30, 15),
  volume_trend JSONB,
  opportunity_score DECIMAL(5, 2) DEFAULT 0,
  
  -- 信号相关字段
  tier_current VARCHAR(10) DEFAULT 'none' CHECK (tier_current IN ('T1', 'T2', 'T3', 'none')),
  score_current DECIMAL(5, 2) DEFAULT 0,
  tier_previous VARCHAR(10) DEFAULT 'none' CHECK (tier_previous IN ('T1', 'T2', 'T3', 'none')),
  score_previous DECIMAL(5, 2) DEFAULT 0,
  tier_change VARCHAR(10) DEFAULT 'initial' CHECK (tier_change IN ('upgrade', 'downgrade', 'unchanged', 'initial')),
  score_change DECIMAL(5, 2) DEFAULT 0,
  signal_reason TEXT,
  signal_updated_at TIMESTAMP,
  
  last_update TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 添加约束
  CONSTRAINT check_fees CHECK (base_fee <= max_fee),
  CONSTRAINT check_decimals CHECK (token_x_decimals BETWEEN 0 AND 18 AND token_y_decimals BETWEEN 0 AND 18),
  CONSTRAINT check_scores CHECK (
    activity_score BETWEEN 1.0 AND 5.0 AND
    score_current BETWEEN 0 AND 100 AND
    score_previous BETWEEN 0 AND 100
  )
);

-- Positions表（仓位表）
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  pool_address VARCHAR(64) NOT NULL REFERENCES pools(address),
  position_address VARCHAR(64) NOT NULL,
  amount_x DECIMAL(30, 9) NOT NULL DEFAULT 0,
  amount_y DECIMAL(30, 9) NOT NULL DEFAULT 0,
  bin_range_lower INT NOT NULL,
  bin_range_upper INT NOT NULL,
  center_bin INT NOT NULL,
  entry_price DECIMAL(30, 15) NOT NULL,
  expected_apr DECIMAL(10, 6) NOT NULL,
  current_value DECIMAL(20, 9) NOT NULL DEFAULT 0,
  profit_loss DECIMAL(20, 9) NOT NULL DEFAULT 0,
  impermanent_loss DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- 投资策略相关字段
  investment_stage INT DEFAULT 1,
  investment_plan JSONB,
  token_a_ratio DECIMAL(5, 2),
  token_b_ratio DECIMAL(5, 2),
  liquidity_distribution JSONB,
  
  -- 健康度评分相关字段
  price_deviation_score DECIMAL(2, 1) DEFAULT 3.0,
  impermanent_loss_score DECIMAL(2, 1) DEFAULT 3.0,
  yield_performance_score DECIMAL(2, 1) DEFAULT 3.0,
  pool_health_score DECIMAL(2, 1) DEFAULT 3.0,
  whale_impact_score DECIMAL(2, 1) DEFAULT 3.0,
  health_score DECIMAL(3, 1) DEFAULT 3.0,
  health_assessment JSONB,
  action_recommendation TEXT,
  health_updated_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 添加约束
  CONSTRAINT check_bin_range CHECK (bin_range_lower < bin_range_upper),
  CONSTRAINT check_health_scores CHECK (
    price_deviation_score BETWEEN 1.0 AND 5.0 AND
    impermanent_loss_score BETWEEN 1.0 AND 5.0 AND
    yield_performance_score BETWEEN 1.0 AND 5.0 AND
    pool_health_score BETWEEN 1.0 AND 5.0 AND
    whale_impact_score BETWEEN 1.0 AND 5.0 AND
    health_score BETWEEN 1.0 AND 5.0
  ),
  CONSTRAINT check_token_ratios CHECK (
    (token_a_ratio IS NULL AND token_b_ratio IS NULL) OR
    (token_a_ratio BETWEEN 0 AND 1 AND token_b_ratio BETWEEN 0 AND 1 AND token_a_ratio + token_b_ratio = 1)
  )
);

-- AgentLogs表（代理日志表）
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  action_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  pool_address VARCHAR(64) REFERENCES pools(address),
  position_id UUID REFERENCES positions(id),
  details JSONB,
  tx_signature VARCHAR(128),
  health_before DECIMAL(3, 1),
  health_after DECIMAL(3, 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- WhaleActivities表（大户活动摘要表）
CREATE TABLE whale_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_address VARCHAR(64) NOT NULL REFERENCES pools(address),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  activity_type VARCHAR(30) NOT NULL,
  change_percent DECIMAL(10, 6) NOT NULL,
  price_impact DECIMAL(2, 1) DEFAULT 3.0,
  liquidity_impact DECIMAL(2, 1) DEFAULT 3.0,
  details JSONB,
  
  -- 添加约束
  CONSTRAINT check_impact_scores CHECK (
    price_impact BETWEEN 1.0 AND 5.0 AND
    liquidity_impact BETWEEN 1.0 AND 5.0
  )
);

-- StrategyDecisions表（策略决策表）
CREATE TABLE strategy_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  decision_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  context JSONB,
  decision_details JSONB,
  execution_status VARCHAR(20) DEFAULT 'pending',
  execution_result JSONB,
  position_id UUID REFERENCES positions(id),
  
  -- 添加约束
  CONSTRAINT check_execution_status CHECK (execution_status IN ('pending', 'executing', 'completed', 'failed', 'cancelled'))
);

-- 创建索引
-- Users表索引
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- Agents表索引
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_balance ON agents(available_balance);

-- Pools表索引
CREATE INDEX idx_pools_tvl ON pools(total_liquidity DESC);
CREATE INDEX idx_pools_apr ON pools(apr DESC);
CREATE INDEX idx_pools_risk ON pools(risk_level);
CREATE INDEX idx_pools_tier ON pools(tier_current);
CREATE INDEX idx_pools_score ON pools(score_current DESC);
CREATE INDEX idx_pools_opportunity ON pools(opportunity_score DESC);
CREATE INDEX idx_pools_update ON pools(last_update);
CREATE INDEX idx_pools_signal_update ON pools(signal_updated_at);

-- Positions表索引
CREATE INDEX idx_positions_agent ON positions(agent_id);
CREATE INDEX idx_positions_pool ON positions(pool_address);
CREATE INDEX idx_positions_health ON positions(health_score);
CREATE INDEX idx_positions_stage ON positions(investment_stage);
CREATE INDEX idx_positions_health_update ON positions(health_updated_at);

-- AgentLogs表索引
CREATE INDEX idx_logs_agent_time ON agent_logs(agent_id, created_at DESC);
CREATE INDEX idx_logs_action ON agent_logs(action_type);
CREATE INDEX idx_logs_position ON agent_logs(position_id);

-- WhaleActivities表索引
CREATE INDEX idx_whale_pool_time ON whale_activities(pool_address, timestamp DESC);
CREATE INDEX idx_whale_impact ON whale_activities(price_impact, liquidity_impact);
CREATE INDEX idx_whale_activity_type ON whale_activities(activity_type);

-- StrategyDecisions表索引
CREATE INDEX idx_strategy_agent ON strategy_decisions(agent_id);
CREATE INDEX idx_strategy_type ON strategy_decisions(decision_type);
CREATE INDEX idx_strategy_time ON strategy_decisions(timestamp DESC);
CREATE INDEX idx_strategy_status ON strategy_decisions(execution_status);
CREATE INDEX idx_strategy_position ON strategy_decisions(position_id);

-- 添加复合索引
CREATE INDEX idx_agents_user_status ON agents(user_id, status);
CREATE INDEX idx_agents_strategy_balance ON agents(strategy, available_balance DESC);
CREATE INDEX idx_pools_tier_score ON pools(tier_current, score_current DESC);
CREATE INDEX idx_pools_risk_apr ON pools(risk_level, apr DESC);
CREATE INDEX idx_positions_agent_health ON positions(agent_id, health_score DESC);
CREATE INDEX idx_whale_pool_impact ON whale_activities(pool_address, price_impact DESC, liquidity_impact DESC);

-- 添加更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新updated_at的表添加触发器
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pools_last_update
    BEFORE UPDATE ON pools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whale_activities_timestamp
    BEFORE UPDATE ON whale_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_decisions_timestamp
    BEFORE UPDATE ON strategy_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加外键级联删除
ALTER TABLE agents
ADD CONSTRAINT fk_agents_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE positions
ADD CONSTRAINT fk_positions_agent
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE agent_logs
ADD CONSTRAINT fk_logs_agent
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE strategy_decisions
ADD CONSTRAINT fk_decisions_agent
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- 添加唯一约束
ALTER TABLE positions
ADD CONSTRAINT uq_position_address UNIQUE (position_address);

-- 添加注释
COMMENT ON TABLE users IS '用户表 - 存储用户基本信息和钱包地址';
COMMENT ON TABLE agents IS '投资代理表 - 用户的自动化投资代理实例';
COMMENT ON TABLE pools IS '流动性池表 - Meteora上的流动性池信息和分析数据';
COMMENT ON TABLE positions IS '仓位表 - Agent在各个池子中的LP仓位';
COMMENT ON TABLE agent_logs IS '代理日志表 - 记录Agent的所有操作历史';
COMMENT ON TABLE whale_activities IS '大户活动表 - 记录对池子有重大影响的大户活动';
COMMENT ON TABLE strategy_decisions IS '策略决策表 - 记录Agent的决策过程和结果';

-- 添加表空间管理（可选，取决于部署环境）
-- ALTER TABLE pools SET TABLESPACE fast_ssd;
-- ALTER TABLE positions SET TABLESPACE fast_ssd;
-- ALTER INDEX idx_pools_tvl SET TABLESPACE fast_ssd;
-- ALTER INDEX idx_positions_agent SET TABLESPACE fast_ssd; 