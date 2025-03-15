# 版本控制规范

## 分支管理

### 分支类型
- `main`: 主分支，用于生产环境
- `develop`: 开发分支，用于开发环境
- `feature/*`: 功能分支，用于新功能开发
- `bugfix/*`: 修复分支，用于bug修复
- `hotfix/*`: 紧急修复分支，用于生产环境紧急修复
- `release/*`: 发布分支，用于版本发布

### 分支命名规范
- 功能分支: `feature/功能名称`
- 修复分支: `bugfix/问题描述`
- 紧急修复: `hotfix/问题描述`
- 发布分支: `release/v版本号`

### 分支管理流程
1. 从`develop`分支创建功能分支
2. 功能开发完成后合并回`develop`
3. 定期从`develop`创建`release`分支
4. `release`分支测试通过后合并到`main`和`develop`
5. 生产环境bug修复从`main`创建`hotfix`分支

## 版本号规范

### 版本号格式
```
v主版本号.次版本号.修订号
例如：v1.0.0
```

### 版本号规则
- 主版本号：重大架构变更
- 次版本号：功能更新
- 修订号：bug修复和小改动

### 版本发布流程
1. 从`develop`创建`release/v版本号`分支
2. 在release分支上进行测试和bug修复
3. 测试通过后合并到`main`和`develop`
4. 在`main`分支上打标签`v版本号`

## 提交规范

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 提交范围
- `agent`: Agent相关
- `pool`: 池子相关
- `api`: API相关
- `config`: 配置相关
- 其他模块名称

### 提交信息示例
```
feat(agent): 添加Agent状态监控功能

- 实现Agent状态实时监控
- 添加状态变更通知
- 集成监控告警系统

Closes #123
```

## 工作流程

### 开发新功能
1. 从`develop`创建功能分支
```bash
git checkout develop
git pull
git checkout -b feature/新功能名称
```

2. 开发完成后提交代码
```bash
git add .
git commit -m "feat(scope): 功能描述"
```

3. 合并回develop
```bash
git checkout develop
git pull
git merge feature/新功能名称
```

### 修复bug
1. 从`develop`创建修复分支
```bash
git checkout develop
git pull
git checkout -b bugfix/问题描述
```

2. 修复完成后提交代码
```bash
git add .
git commit -m "fix(scope): 问题描述"
```

3. 合并回develop
```bash
git checkout develop
git pull
git merge bugfix/问题描述
```

### 发布新版本
1. 创建发布分支
```bash
git checkout develop
git pull
git checkout -b release/v1.0.0
```

2. 测试和修复
3. 合并到main和develop
```bash
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"

git checkout develop
git merge release/v1.0.0
```

4. 删除发布分支
```bash
git branch -d release/v1.0.0
``` 