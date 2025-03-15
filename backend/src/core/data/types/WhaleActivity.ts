export interface WhaleActivityEvent {
  // 基本信息
  id: string;                  // 活动唯一ID
  poolAddress: string;         // 池子地址
  poolName: string;           // 池子名称(如 "SOL-USDC")
  timestamp: number;          // 发生时间戳
  
  // 总流动性变化
  totalLiquidityBefore: string; // 变化前总流动性
  totalLiquidityAfter: string;  // 变化后总流动性
  totalChangeAmount: string;    // 总变化量(美元价值)
  totalChangePercent: number;   // 总变化百分比
  
  // 最大的3笔单笔流动性变化
  topChanges: Array<{
    binRange: {              // 流动性变化发生的bin范围
      lower: number;
      upper: number;
    },
    amount: string;          // 单笔变化量(美元价值)
    percent: number;         // 单笔变化占池子总流动性的百分比
    pricePoint: string;      // 该bin的价格点
    type: 'add' | 'remove';  // 添加或移除流动性
  }>;
  
  // 流动性分布变化
  concentrationBefore: number;  // 变化前流动性集中度(0-1)
  concentrationAfter: number;   // 变化后流动性集中度(0-1)
  
  // 价格信息
  currentPrice: string;         // 当前价格
  
  // 风险评估
  riskLevel: 'low' | 'medium' | 'high';
  
  // 元数据
  detectionMethod: 'polling' | 'eventListener';
  detectionTime: number;
} 