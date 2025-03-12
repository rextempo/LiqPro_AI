import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 定义Agent创建表单数据类型
interface AgentFormData {
  name: string;
  initialFunds: number;
  riskLevel: number;
  description: string;
  autoRebalance: boolean;
  maxPositions: number;
  emergencyThreshold: number;
}

// Agent创建表单组件
const AgentCreate: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    initialFunds: 1,
    riskLevel: 2,
    description: '',
    autoRebalance: true,
    maxPositions: 5,
    emergencyThreshold: 20
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({});

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // 处理不同类型的输入
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AgentFormData, string>> = {};
    
    // 验证名称
    if (!formData.name.trim()) {
      newErrors.name = 'Agent名称不能为空';
    }
    
    // 验证初始资金
    if (formData.initialFunds <= 0) {
      newErrors.initialFunds = '初始资金必须大于0';
    }
    
    // 验证最大仓位数
    if (formData.maxPositions < 1 || formData.maxPositions > 10) {
      newErrors.maxPositions = '最大仓位数必须在1-10之间';
    }
    
    // 验证紧急阈值
    if (formData.emergencyThreshold < 5 || formData.emergencyThreshold > 50) {
      newErrors.emergencyThreshold = '紧急阈值必须在5%-50%之间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 在实际应用中，这里会调用API创建Agent
      // const response = await agentClient.createAgent(formData);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟成功创建
      console.log('Agent created:', formData);
      
      // 重定向到Agent列表页面
      navigate('/agents');
    } catch (error) {
      console.error('Failed to create agent:', error);
      // 显示错误消息
      alert('创建Agent失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    navigate('/agents');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">创建新Agent</h2>
        <p className="text-gray-600">配置您的自动化投资Agent</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* 基本信息 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">基本信息</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent名称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Agent名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="输入Agent名称"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            
            {/* 初始资金 */}
            <div>
              <label htmlFor="initialFunds" className="block text-sm font-medium text-gray-700 mb-1">
                初始资金 (SOL) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="initialFunds"
                name="initialFunds"
                value={formData.initialFunds}
                onChange={handleInputChange}
                min="0.1"
                step="0.1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.initialFunds ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.initialFunds && <p className="mt-1 text-sm text-red-500">{errors.initialFunds}</p>}
            </div>
          </div>
          
          {/* 描述 */}
          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="描述这个Agent的投资策略和目标"
            />
          </div>
        </div>
        
        {/* 风险设置 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">风险设置</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 风险等级 */}
            <div>
              <label htmlFor="riskLevel" className="block text-sm font-medium text-gray-700 mb-1">
                风险等级
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  id="riskLevel"
                  name="riskLevel"
                  min="1"
                  max="5"
                  value={formData.riskLevel}
                  onChange={handleInputChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {formData.riskLevel}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>保守</span>
                <span>平衡</span>
                <span>激进</span>
              </div>
            </div>
            
            {/* 紧急阈值 */}
            <div>
              <label htmlFor="emergencyThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                紧急阈值 (%)
              </label>
              <input
                type="number"
                id="emergencyThreshold"
                name="emergencyThreshold"
                value={formData.emergencyThreshold}
                onChange={handleInputChange}
                min="5"
                max="50"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.emergencyThreshold ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.emergencyThreshold && (
                <p className="mt-1 text-sm text-red-500">{errors.emergencyThreshold}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                当资产价值下降超过此百分比时，Agent将触发紧急操作
              </p>
            </div>
          </div>
        </div>
        
        {/* 高级设置 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">高级设置</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 自动再平衡 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRebalance"
                name="autoRebalance"
                checked={formData.autoRebalance}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoRebalance" className="ml-2 block text-sm text-gray-700">
                启用自动再平衡
              </label>
            </div>
            
            {/* 最大仓位数 */}
            <div>
              <label htmlFor="maxPositions" className="block text-sm font-medium text-gray-700 mb-1">
                最大仓位数
              </label>
              <input
                type="number"
                id="maxPositions"
                name="maxPositions"
                value={formData.maxPositions}
                onChange={handleInputChange}
                min="1"
                max="10"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxPositions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxPositions && <p className="mt-1 text-sm text-red-500">{errors.maxPositions}</p>}
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                创建中...
              </span>
            ) : (
              '创建Agent'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgentCreate; 