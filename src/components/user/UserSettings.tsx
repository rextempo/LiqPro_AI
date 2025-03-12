import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  FormField, 
  Input, 
  LoadingState, 
  ErrorState,
  notification,
  Tabs
} from '../ui';
import { useUserManagementApi, useUserManagementMutation } from '../../api/userManagementApi';

// 用户设置类型定义
interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  notificationSettings: {
    email: boolean;
    browser: boolean;
    mobile: boolean;
  };
  displaySettings: {
    compactView: boolean;
    showTutorials: boolean;
    animationsEnabled: boolean;
  };
  securitySettings: {
    twoFactorEnabled: boolean;
    sessionTimeout: number; // 分钟
    loginNotifications: boolean;
  };
}

// 用户个人信息类型定义
interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  bio: string | null;
  lastLogin: string | null;
  createdAt: string;
}

// 密码修改表单类型
interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 用户设置组件
 * 用于管理用户个人设置
 */
const UserSettings: React.FC = () => {
  // 状态
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileFormErrors, setProfileFormErrors] = useState<Record<string, string>>({});
  const [passwordFormErrors, setPasswordFormErrors] = useState<Record<string, string>>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // API调用
  const { 
    data: profile, 
    loading: isLoadingProfile, 
    error: profileError, 
    refresh: refreshProfile 
  } = useUserManagementApi<UserProfile>('user/profile', {
    ttl: 60000, // 60秒缓存
  });
  
  const { 
    data: settings, 
    loading: isLoadingSettings, 
    error: settingsError, 
    refresh: refreshSettings 
  } = useUserManagementApi<UserSettings>('user/settings', {
    ttl: 60000, // 60秒缓存
  });
  
  const updateProfileMutation = useUserManagementMutation<UserProfile, Partial<UserProfile>>('user/profile', 'PUT');
  const updateSettingsMutation = useUserManagementMutation<UserSettings, Partial<UserSettings>>('user/settings', 'PUT');
  const changePasswordMutation = useUserManagementMutation<void, Omit<PasswordChangeForm, 'confirmPassword'>>('user/change-password', 'POST');
  
  // 初始化数据
  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
    
    if (settings) {
      setUserSettings(settings);
    }
  }, [profile, settings]);
  
  // 处理个人资料表单变更
  const handleProfileChange = (field: keyof UserProfile, value: any) => {
    if (!userProfile) return;
    
    setUserProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
    
    // 清除错误
    if (profileFormErrors[field]) {
      setProfileFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  
  // 处理密码表单变更
  const handlePasswordChange = (field: keyof PasswordChangeForm, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 清除错误
    if (passwordFormErrors[field]) {
      setPasswordFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  
  // 处理设置变更
  const handleSettingChange = (category: keyof UserSettings, field: string, value: any) => {
    if (!userSettings) return;
    
    setUserSettings(prev => {
      if (!prev) return prev;
      
      if (typeof prev[category] === 'object') {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [field]: value,
          },
        };
      } else {
        return {
          ...prev,
          [category]: value,
        };
      }
    });
  };
  
  // 验证个人资料表单
  const validateProfileForm = (): boolean => {
    if (!userProfile) return false;
    
    const errors: Record<string, string> = {};
    
    if (!userProfile.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userProfile.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    if (!userProfile.fullName.trim()) {
      errors.fullName = '姓名不能为空';
    }
    
    setProfileFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 验证密码表单
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = '当前密码不能为空';
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = '新密码不能为空';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = '新密码长度不能少于8个字符';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = '新密码必须包含大小写字母和数字';
    }
    
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = '确认密码不能为空';
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }
    
    setPasswordFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理保存个人资料
  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;
    
    try {
      await updateProfileMutation.mutate({
        fullName: userProfile?.fullName,
        email: userProfile?.email,
        phone: userProfile?.phone,
        position: userProfile?.position,
        department: userProfile?.department,
        bio: userProfile?.bio,
      });
      
      notification.success('个人资料更新成功');
      setIsEditingProfile(false);
      refreshProfile();
    } catch (error) {
      notification.error({
        title: '个人资料更新失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理保存设置
  const handleSaveSettings = async () => {
    if (!userSettings) return;
    
    try {
      await updateSettingsMutation.mutate(userSettings);
      notification.success('设置更新成功');
      refreshSettings();
    } catch (error) {
      notification.error({
        title: '设置更新失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理修改密码
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    
    try {
      await changePasswordMutation.mutate({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      notification.success('密码修改成功');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      notification.error({
        title: '密码修改失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 渲染个人资料表单
  const renderProfileForm = () => {
    if (isLoadingProfile) {
      return <LoadingState centered text="加载个人资料中..." />;
    }
    
    if (profileError) {
      return (
        <ErrorState 
          message="加载个人资料失败" 
          type="error" 
          onRetry={refreshProfile}
          centered
        />
      );
    }
    
    if (!userProfile) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">个人资料</h3>
          {isEditingProfile ? (
            <div className="flex space-x-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsEditingProfile(false);
                  setUserProfile(profile);
                }}
              >
                取消
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveProfile}
                loading={updateProfileMutation.loading}
              >
                保存
              </Button>
            </div>
          ) : (
            <Button 
              variant="primary" 
              onClick={() => setIsEditingProfile(true)}
            >
              编辑
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="用户名"
            helpText="用户名不可修改"
          >
            <Input
              value={userProfile.username}
              disabled
            />
          </FormField>
          
          <FormField
            label="姓名"
            required
            error={profileFormErrors.fullName}
          >
            <Input
              value={userProfile.fullName}
              onChange={(e) => handleProfileChange('fullName', e.target.value)}
              disabled={!isEditingProfile}
              status={profileFormErrors.fullName ? 'error' : 'default'}
            />
          </FormField>
          
          <FormField
            label="邮箱"
            required
            error={profileFormErrors.email}
          >
            <Input
              value={userProfile.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              disabled={!isEditingProfile}
              status={profileFormErrors.email ? 'error' : 'default'}
            />
          </FormField>
          
          <FormField
            label="手机号码"
          >
            <Input
              value={userProfile.phone || ''}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              disabled={!isEditingProfile}
            />
          </FormField>
          
          <FormField
            label="职位"
          >
            <Input
              value={userProfile.position || ''}
              onChange={(e) => handleProfileChange('position', e.target.value)}
              disabled={!isEditingProfile}
            />
          </FormField>
          
          <FormField
            label="部门"
          >
            <Input
              value={userProfile.department || ''}
              onChange={(e) => handleProfileChange('department', e.target.value)}
              disabled={!isEditingProfile}
            />
          </FormField>
        </div>
        
        <FormField
          label="个人简介"
        >
          <textarea
            value={userProfile.bio || ''}
            onChange={(e) => handleProfileChange('bio', e.target.value)}
            disabled={!isEditingProfile}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            rows={4}
          />
        </FormField>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500">创建时间</h4>
            <p className="mt-1 text-sm text-gray-900">{new Date(userProfile.createdAt).toLocaleString()}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">最后登录时间</h4>
            <p className="mt-1 text-sm text-gray-900">
              {userProfile.lastLogin ? new Date(userProfile.lastLogin).toLocaleString() : '从未登录'}
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染密码修改表单
  const renderPasswordForm = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">修改密码</h3>
        </div>
        
        <div className="space-y-4">
          <FormField
            label="当前密码"
            required
            error={passwordFormErrors.currentPassword}
          >
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              status={passwordFormErrors.currentPassword ? 'error' : 'default'}
            />
          </FormField>
          
          <FormField
            label="新密码"
            required
            error={passwordFormErrors.newPassword}
            helpText="密码长度不少于8个字符，必须包含大小写字母和数字"
          >
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
              status={passwordFormErrors.newPassword ? 'error' : 'default'}
            />
          </FormField>
          
          <FormField
            label="确认新密码"
            required
            error={passwordFormErrors.confirmPassword}
          >
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
              status={passwordFormErrors.confirmPassword ? 'error' : 'default'}
            />
          </FormField>
          
          <div className="pt-4">
            <Button 
              variant="primary" 
              onClick={handleChangePassword}
              loading={changePasswordMutation.loading}
            >
              修改密码
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染设置表单
  const renderSettingsForm = () => {
    if (isLoadingSettings) {
      return <LoadingState centered text="加载设置中..." />;
    }
    
    if (settingsError) {
      return (
        <ErrorState 
          message="加载设置失败" 
          type="error" 
          onRetry={refreshSettings}
          centered
        />
      );
    }
    
    if (!userSettings) return null;
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">系统设置</h3>
          <Button 
            variant="primary" 
            onClick={handleSaveSettings}
            loading={updateSettingsMutation.loading}
          >
            保存设置
          </Button>
        </div>
        
        {/* 外观设置 */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">外观设置</h4>
          
          <FormField
            label="主题"
          >
            <select
              value={userSettings.theme}
              onChange={(e) => handleSettingChange('theme', '', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="system">跟随系统</option>
            </select>
          </FormField>
          
          <FormField
            label="语言"
          >
            <select
              value={userSettings.language}
              onChange={(e) => handleSettingChange('language', '', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English (US)</option>
            </select>
          </FormField>
          
          <FormField
            label="时区"
          >
            <select
              value={userSettings.timezone}
              onChange={(e) => handleSettingChange('timezone', '', e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="Asia/Shanghai">中国标准时间 (GMT+8)</option>
              <option value="America/New_York">美国东部时间 (GMT-5)</option>
              <option value="Europe/London">格林威治标准时间 (GMT)</option>
              <option value="Europe/Paris">中欧时间 (GMT+1)</option>
              <option value="Asia/Tokyo">日本标准时间 (GMT+9)</option>
            </select>
          </FormField>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="日期格式"
            >
              <select
                value={userSettings.dateFormat}
                onChange={(e) => handleSettingChange('dateFormat', '', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="YYYY-MM-DD">2023-01-31</option>
                <option value="DD/MM/YYYY">31/01/2023</option>
                <option value="MM/DD/YYYY">01/31/2023</option>
                <option value="YYYY年MM月DD日">2023年01月31日</option>
              </select>
            </FormField>
            
            <FormField
              label="时间格式"
            >
              <select
                value={userSettings.timeFormat}
                onChange={(e) => handleSettingChange('timeFormat', '', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="HH:mm:ss">24小时制 (14:30:00)</option>
                <option value="hh:mm:ss a">12小时制 (02:30:00 PM)</option>
              </select>
            </FormField>
          </div>
        </div>
        
        {/* 显示设置 */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">显示设置</h4>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="compactView"
                type="checkbox"
                checked={userSettings.displaySettings.compactView}
                onChange={(e) => handleSettingChange('displaySettings', 'compactView', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="compactView" className="ml-2 block text-sm text-gray-900">
                紧凑视图（减少页面间距，显示更多内容）
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="showTutorials"
                type="checkbox"
                checked={userSettings.displaySettings.showTutorials}
                onChange={(e) => handleSettingChange('displaySettings', 'showTutorials', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showTutorials" className="ml-2 block text-sm text-gray-900">
                显示功能引导和教程
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="animationsEnabled"
                type="checkbox"
                checked={userSettings.displaySettings.animationsEnabled}
                onChange={(e) => handleSettingChange('displaySettings', 'animationsEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="animationsEnabled" className="ml-2 block text-sm text-gray-900">
                启用界面动画效果
              </label>
            </div>
          </div>
        </div>
        
        {/* 通知设置 */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">通知设置</h4>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="emailNotifications"
                type="checkbox"
                checked={userSettings.notificationSettings.email}
                onChange={(e) => handleSettingChange('notificationSettings', 'email', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                接收邮件通知
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="browserNotifications"
                type="checkbox"
                checked={userSettings.notificationSettings.browser}
                onChange={(e) => handleSettingChange('notificationSettings', 'browser', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="browserNotifications" className="ml-2 block text-sm text-gray-900">
                接收浏览器通知
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="mobileNotifications"
                type="checkbox"
                checked={userSettings.notificationSettings.mobile}
                onChange={(e) => handleSettingChange('notificationSettings', 'mobile', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="mobileNotifications" className="ml-2 block text-sm text-gray-900">
                接收移动端通知
              </label>
            </div>
          </div>
        </div>
        
        {/* 安全设置 */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">安全设置</h4>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="twoFactorEnabled"
                type="checkbox"
                checked={userSettings.securitySettings.twoFactorEnabled}
                onChange={(e) => handleSettingChange('securitySettings', 'twoFactorEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="twoFactorEnabled" className="ml-2 block text-sm text-gray-900">
                启用两步验证
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="loginNotifications"
                type="checkbox"
                checked={userSettings.securitySettings.loginNotifications}
                onChange={(e) => handleSettingChange('securitySettings', 'loginNotifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="loginNotifications" className="ml-2 block text-sm text-gray-900">
                接收登录通知
              </label>
            </div>
          </div>
          
          <FormField
            label="会话超时时间（分钟）"
            helpText="设置为0表示不超时"
          >
            <input
              type="number"
              min="0"
              max="1440"
              value={userSettings.securitySettings.sessionTimeout}
              onChange={(e) => handleSettingChange('securitySettings', 'sessionTimeout', parseInt(e.target.value) || 0)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </FormField>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">用户设置</h2>
      </div>
      
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'profile',
              label: '个人资料',
              children: renderProfileForm(),
            },
            {
              key: 'password',
              label: '修改密码',
              children: renderPasswordForm(),
            },
            {
              key: 'settings',
              label: '系统设置',
              children: renderSettingsForm(),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default UserSettings; 