# TypeScript 编码规则

本目录包含 LiqPro 项目中使用的 TypeScript ESLint 规则的详细说明。这些规则文档主要用作参考，帮助开发者理解和遵循项目的编码标准。

## 规则分类

TypeScript ESLint 规则可以分为以下几类：

### 可能的错误

这些规则与可能导致错误或意外行为的代码模式有关：

- [no-explicit-any](./no-explicit-any.md) - 禁止使用 `any` 类型
- [no-unsafe-assignment](./no-unsafe-assignment.md) - 禁止将 `any` 类型的值赋值给变量和属性
- [no-unsafe-call](./no-unsafe-call.md) - 禁止调用 `any` 类型的值
- [no-unsafe-member-access](./no-unsafe-member-access.md) - 禁止访问 `any` 类型的值的属性
- [no-unsafe-return](./no-unsafe-return.md) - 禁止从函数返回 `any` 类型的值

### 最佳实践

这些规则鼓励更好的编码实践：

- [prefer-as-const](./prefer-as-const.md) - 鼓励使用 `as const` 而不是类型断言
- [prefer-nullish-coalescing](./prefer-nullish-coalescing.md) - 鼓励使用空值合并运算符
- [prefer-optional-chain](./prefer-optional-chain.md) - 鼓励使用可选链运算符
- [prefer-readonly](./prefer-readonly.md) - 鼓励使用 `readonly` 修饰符
- [prefer-string-starts-ends-with](./prefer-string-starts-ends-with.md) - 鼓励使用 `String#startsWith` 和 `String#endsWith`

### 代码风格

这些规则与代码风格和一致性有关：

- [semi](./semi.md) - 要求或禁止使用分号
- [quotes](./quotes.md) - 强制使用一致的引号风格
- [space-before-blocks](./space-before-blocks.md) - 要求或禁止在块之前有空格
- [space-before-function-paren](./space-before-function-paren.md) - 要求或禁止在函数括号之前有空格
- [type-annotation-spacing](./type-annotation-spacing.md) - 要求在类型注释周围有一致的空格

## 使用指南

1. 这些规则文档主要用作参考，实际的规则配置在项目的 `.eslintrc.json` 文件中
2. 在开发过程中，可以使用 ESLint 自动检查代码是否符合这些规则
3. 许多规则问题可以通过 ESLint 的自动修复功能解决

## 规则更新

如果需要更新或修改项目的 ESLint 规则配置，请遵循以下步骤：

1. 在 `.eslintrc.json` 文件中更新规则配置
2. 更新本文档以反映新的规则或规则变更
3. 通知团队成员关于规则变更的信息

## 参考资源

- [TypeScript ESLint 官方文档](https://typescript-eslint.io/rules/)
- [ESLint 官方文档](https://eslint.org/docs/rules/)
