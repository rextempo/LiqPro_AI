import React from 'react';
import { Icon, IconProps } from '@chakra-ui/react';
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons/lib';

// 创建一个包装器组件，将react-icons的IconType转换为可用于Chakra UI的组件
export const IconWrapper = (props: { icon: IconType } & Omit<IconProps, 'as'>) => {
  const { icon, ...rest } = props;
  return <Icon as={icon as any} {...rest} />;
};

// 创建一个包装器组件，将react-icons的IconType转换为可用于Button的leftIcon或rightIcon
export const ButtonIcon = ({ icon, ...props }: { icon: IconType } & IconBaseProps) => {
  return React.createElement(icon as any, props);
};

export default IconWrapper; 