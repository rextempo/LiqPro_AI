# React-Icons 使用指南

在本项目中，我们使用 React-Icons 库来提供图标。由于 React-Icons 的 IconType 类型与 Chakra UI 的组件期望的类型不兼容，我们创建了两个包装器组件来解决这个问题。

## IconWrapper 和 ButtonIcon 组件

我们提供了两个组件来解决 React-Icons 与 Chakra UI 的兼容性问题：

1. `IconWrapper` - 用于在 Chakra UI 的 `Icon` 组件中使用 React-Icons
2. `ButtonIcon` - 用于在 Button 组件的 `leftIcon` 或 `rightIcon` 属性中使用 React-Icons

## 使用方法

### 在 Chakra UI 的 Icon 组件中使用

```tsx
import { FiAlertTriangle } from 'react-icons/fi';
import IconWrapper from '../components/IconWrapper';

// 错误的用法
<Icon as={FiAlertTriangle} color="red.500" />

// 正确的用法
<IconWrapper icon={FiAlertTriangle} color="red.500" />
```

### 在 Button 组件中使用

```tsx
import { FiCheck } from 'react-icons/fi';
import { ButtonIcon } from '../components/IconWrapper';

// 错误的用法
<Button leftIcon={<FiCheck />} colorScheme="green">确认</Button>

// 正确的用法
<Button leftIcon={<ButtonIcon icon={FiCheck} />} colorScheme="green">确认</Button>
```

### 在其他组件中使用

对于其他需要直接使用 React-Icons 的情况，可以直接使用：

```tsx
import { FiAlertTriangle } from 'react-icons/fi';

// 直接使用
<FiAlertTriangle />
```

## 示例

请参考 `IconUsageExample.tsx` 文件，了解更多使用示例。

## 注意事项

1. 在修复现有代码时，请确保导入正确的包装器组件
2. 对于 Chakra UI 的 `Icon` 组件，使用 `IconWrapper`
3. 对于 Button 的 `leftIcon` 或 `rightIcon` 属性，使用 `ButtonIcon`
4. 这些包装器组件支持所有原始组件的属性

# 组件使用指南

## IconWrapper 和 ButtonIcon 组件

### 背景

在使用 React Icons 与 Chakra UI 组件集成时，会遇到 TypeScript 类型错误，例如：

```
TS2786: 'FiSave' cannot be used as a JSX component.
  Its return type 'ReactNode' is not a valid JSX element.
```

这是因为 React Icons 返回的是 `ReactNode` 类型，而不是有效的 JSX 元素，导致与 Chakra UI 的 `Icon` 组件或按钮的 `leftIcon`/`rightIcon` 属性不兼容。

### 解决方案

为了解决这个问题，我们创建了两个包装组件：

1. `IconWrapper` - 用于替代 Chakra UI 的 `<Icon as={...} />` 用法
2. `ButtonIcon` - 专门用于按钮的 `leftIcon` 和 `rightIcon` 属性

### 使用方法

#### 错误的用法（会导致 TypeScript 错误）

```tsx
// 在按钮中直接使用图标
<Button leftIcon={<FiSave />}>保存</Button>

// 在 Chakra UI 的 Icon 组件中使用
<Icon as={FiInfo} />
```

#### 正确的用法

```tsx
import { FiSave, FiInfo } from 'react-icons/fi';
import { IconWrapper, ButtonIcon } from '../components/IconWrapper';

// 在按钮中使用 ButtonIcon
<Button leftIcon={<ButtonIcon icon={FiSave} />}>保存</Button>

// 使用 IconWrapper 替代 Icon
<IconWrapper icon={FiInfo} />
```

### 传递其他属性

两个组件都支持传递额外的属性到底层组件：

```tsx
// 传递样式属性
<IconWrapper icon={FiInfo} color="blue.500" fontSize="20px" />

// 传递事件处理器
<ButtonIcon icon={FiTrash} onClick={handleDelete} color="red.500" />
```

### API

#### IconWrapper

| 属性 | 类型 | 描述 |
|------|------|------|
| icon | IconType | React Icons 图标组件 |
| ...rest | any | 传递给底层 Chakra UI Icon 组件的其他属性 |

#### ButtonIcon

| 属性 | 类型 | 描述 |
|------|------|------|
| icon | IconType | React Icons 图标组件 |
| ...rest | any | 传递给底层图标组件的其他属性 | 