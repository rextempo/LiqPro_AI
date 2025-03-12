import React, { useState } from 'react';

// 定义Agent控制组件的属性
interface AgentControlsProps {
  agentId: string;
  status: 'active' | 'paused' | 'error';
  onStatusChange: (status: 'active' | 'paused') => Promise<void>;
  onEmergencyStop: () => Promise<void>;
  onRebalance: () => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
  onDeposit: (amount: number) => Promise<void>;
  balance: number;
}

// Agent控制组件
const AgentControls: React.FC<AgentControlsProps> = ({
  agentId,
  status,
  onStatusChange,
  onEmergencyStop,
  onRebalance,
  onWithdraw,
  onDeposit,
  balance
}) => {
  const [isLoading, setIsLoading] = useState<{
    status: boolean;
    emergency: boolean;
    rebalance: boolean;
    withdraw: boolean;
    deposit: boolean;
  }>({
    status: false,
    emergency: false,
    rebalance: false,
    withdraw: false,
    deposit: false
  });
  
  const [amount, setAmount] = useState<number>(0);
  const [showFundingModal, setShowFundingModal] = useState<'withdraw' | 'deposit' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理状态变更
  const handleStatusChange = async () => {
    setError(null);
    setIsLoading(prev => ({ ...prev, status: true }));
    
    try {
      const newStatus = status === 'active' ? 'paused' : 'active';
      await onStatusChange(newStatus);
    } catch (error) {
      setError('状态更新失败，请重试');
      console.error('Failed to update status:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, status: false }));
    }
  };

  // 处理紧急停止
  const handleEmergencyStop = async () => {
    if (!window.confirm('确定要执行紧急停止吗？这将立即停止所有交易活动并可能导致损失。')) {
      return;
    }
    
    setError(null);
    setIsLoading(prev => ({ ...prev, emergency: true }));
    
    try {
      await onEmergencyStop();
    } catch (error) {
      setError('紧急停止失败，请重试');
      console.error('Failed to emergency stop:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, emergency: false }));
    }
  };

  // 处理再平衡
  const handleRebalance = async () => {
    if (!window.confirm('确定要执行再平衡操作吗？这将根据当前策略调整所有仓位。')) {
      return;
    }
    
    setError(null);
    setIsLoading(prev => ({ ...prev, rebalance: true }));
    
    try {
      await onRebalance();
    } catch (error) {
      setError('再平衡操作失败，请重试');
      console.error('Failed to rebalance:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, rebalance: false }));
    }
  };

  // 处理资金操作
  const handleFundingOperation = async () => {
    if (!showFundingModal) return;
    
    if (amount <= 0) {
      setError('金额必须大于0');
      return;
    }
    
    if (showFundingModal === 'withdraw' && amount > balance) {
      setError('提取金额不能超过当前余额');
      return;
    }
    
    setError(null);
    setIsLoading(prev => ({ ...prev, [showFundingModal]: true }));
    
    try {
      if (showFundingModal === 'withdraw') {
        await onWithdraw(amount);
      } else {
        await onDeposit(amount);
      }
      
      // 成功后关闭模态框并重置金额
      setShowFundingModal(null);
      setAmount(0);
    } catch (error) {
      setError(`${showFundingModal === 'withdraw' ? '提取' : '存入'}操作失败，请重试`);
      console.error(`Failed to ${showFundingModal}:`, error);
    } finally {
      setIsLoading(prev => ({ ...prev, [showFundingModal]: false }));
    }
  };

  // 资金操作模态框
  const renderFundingModal = () => {
    if (!showFundingModal) return null;
    
    const isWithdraw = showFundingModal === 'withdraw';
    const title = isWithdraw ? '提取资金' : '存入资金';
    const buttonText = isWithdraw ? '提取' : '存入';
    const loadingState = isWithdraw ? isLoading.withdraw : isLoading.deposit;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              金额 (SOL)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isWithdraw && (
              <p className="mt-1 text-sm text-gray-500">
                可用余额: {balance.toFixed(2)} SOL
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowFundingModal(null);
                setAmount(0);
                setError(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleFundingOperation}
              disabled={loadingState}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                loadingState ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loadingState ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </span>
              ) : (
                buttonText
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4">Agent控制</h3>
      
      {error && !showFundingModal && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 状态控制 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">状态控制</h4>
          <div className="flex space-x-2">
            <button
              onClick={handleStatusChange}
              disabled={isLoading.status || status === 'error'}
              className={`flex-1 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                status === 'active'
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              } ${(isLoading.status || status === 'error') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading.status ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </span>
              ) : (
                status === 'active' ? '暂停Agent' : '启动Agent'
              )}
            </button>
            <button
              onClick={handleEmergencyStop}
              disabled={isLoading.emergency || status === 'error'}
              className={`flex-1 px-3 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isLoading.emergency || status === 'error' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading.emergency ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </span>
              ) : (
                '紧急停止'
              )}
            </button>
          </div>
        </div>
        
        {/* 资金管理 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">资金管理</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFundingModal('deposit')}
              className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              存入资金
            </button>
            <button
              onClick={() => setShowFundingModal('withdraw')}
              disabled={balance <= 0}
              className={`flex-1 px-3 py-2 bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                balance <= 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              提取资金
            </button>
          </div>
        </div>
      </div>
      
      {/* 再平衡操作 */}
      <div className="mt-4 p-4 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">投资组合管理</h4>
        <button
          onClick={handleRebalance}
          disabled={isLoading.rebalance || status !== 'active'}
          className={`w-full px-3 py-2 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isLoading.rebalance || status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading.rebalance ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : (
            '执行再平衡'
          )}
        </button>
        {status !== 'active' && (
          <p className="mt-1 text-xs text-gray-500">
            Agent必须处于运行状态才能执行再平衡操作
          </p>
        )}
      </div>
      
      {/* 资金操作模态框 */}
      {renderFundingModal()}
    </div>
  );
};

export default AgentControls; 