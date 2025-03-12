import React from 'react';
import { Icon, IconProps } from '@chakra-ui/react';
import { IconType } from 'react-icons';

export interface IconWrapperProps extends Omit<IconProps, 'as'> {
  icon: IconType;
}

/**
 * IconWrapper组件
 * 用于将react-icons与Chakra UI的Icon组件集成
 */
export const IconWrapper: React.FC<IconWrapperProps> = (props) => {
  const { icon, ...restProps } = props;
  // @ts-ignore - 忽略类型错误，因为我们知道这是有效的
  return <Icon as={icon} {...restProps} />;
};

/**
 * 按钮图标组件
 * 用于在按钮中使用react-icons
 */
export const ButtonIcon: React.FC<IconWrapperProps> = (props) => {
  const { icon: IconComponent, ...restProps } = props;
  // @ts-ignore - 忽略类型错误，因为我们知道这是有效的
  return <IconComponent {...restProps} />;
};

export default IconWrapper; 