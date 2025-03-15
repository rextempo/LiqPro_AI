-- 测试环境种子数据
-- 创建于: 2025-03-16
-- 描述: 创建基础测试数据

-- 测试用户数据
INSERT INTO users (id, wallet_address, nonce) VALUES
  ('11111111-1111-1111-1111-111111111111', 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5HNVGK', 'test_nonce_1'),
  ('22222222-2222-2222-2222-222222222222', '2ZZW5qvqJDkXf7uyRNXHMLBGkXF147gTACB4kXrnScZZ', 'test_nonce_2');

-- 测试池子数据
INSERT INTO pools (
  address, name, 
  token_x_mint, token_x_symbol, token_x_decimals,
  token_y_mint, token_y_symbol, token_y_decimals,
  bin_step, base_fee, max_fee, current_price,
  total_liquidity, volume_24h, fees_24h,
  risk_level, tier_current, score_current
) VALUES
  (
    'POOL111111111111111111111111111111111111111',
    'SOL-USDC',
    'So11111111111111111111111111111111111111112',
    'SOL',
    9,
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'USDC',
    6,
    10,
    0.01,
    0.02,
    100.50,
    1000000.00,
    50000.00,
    100.00,
    'low',
    'T1',
    85.5
  ),
  (
    'POOL222222222222222222222222222222222222222',
    'SOL-USDT',
    'So11111111111111111111111111111111111111112',
    'SOL',
    9,
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'USDT',
    6,
    20,
    0.02,
    0.03,
    101.20,
    800000.00,
    40000.00,
    80.00,
    'medium',
    'T2',
    75.0
  );

-- 测试代理数据
INSERT INTO agents (
  id, user_id, name, status, strategy,
  deposit_amount, current_value, profit_loss,
  available_balance, positions_limit, reserved_balance,
  strategy_params
) VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Conservative Bot 1',
    'active',
    'conservative',
    1000.00,
    1050.00,
    50.00,
    100.00,
    3,
    0.2,
    '{"risk_tolerance": 0.3, "max_position_size": 500.00}'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Aggressive Bot 1',
    'active',
    'aggressive',
    2000.00,
    2200.00,
    200.00,
    300.00,
    5,
    0.1,
    '{"risk_tolerance": 0.7, "max_position_size": 1000.00}'
  );

-- 测试仓位数据
INSERT INTO positions (
  id, agent_id, pool_address, position_address,
  amount_x, amount_y, bin_range_lower, bin_range_upper,
  center_bin, entry_price, expected_apr, current_value,
  profit_loss, health_score
) VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'POOL111111111111111111111111111111111111111',
    'POS1111111111111111111111111111111111111111',
    5.0,
    500.0,
    1000,
    1100,
    1050,
    100.0,
    0.15,
    525.0,
    25.0,
    4.5
  );

-- 测试代理日志数据
INSERT INTO agent_logs (
  id, agent_id, action_type, status,
  pool_address, position_id, details
) VALUES
  (
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    'add_liquidity',
    'success',
    'POOL111111111111111111111111111111111111111',
    '55555555-5555-5555-5555-555555555555',
    '{"amount_x": 5.0, "amount_y": 500.0, "tx_hash": "test_hash_1"}'
  );

-- 测试大户活动数据
INSERT INTO whale_activities (
  id, pool_address, activity_type,
  change_percent, price_impact, liquidity_impact,
  details
) VALUES
  (
    '77777777-7777-7777-7777-777777777777',
    'POOL111111111111111111111111111111111111111',
    'large_deposit',
    0.05,
    3.5,
    4.0,
    '{"amount": 100000.00, "direction": "deposit"}'
  );

-- 测试策略决策数据
INSERT INTO strategy_decisions (
  id, agent_id, decision_type,
  context, decision_details, execution_status,
  position_id
) VALUES
  (
    '88888888-8888-8888-8888-888888888888',
    '33333333-3333-3333-3333-333333333333',
    'position_adjustment',
    '{"current_price": 100.50, "health_score": 4.5}',
    '{"action": "rebalance", "target_bins": [1000, 1100]}',
    'completed',
    '55555555-5555-5555-5555-555555555555'
  ); 