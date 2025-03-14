# RabbitMQ 用户名和密码配置指南

## 问题描述

在LiqPro系统中，RabbitMQ的用户名和密码配置存在不一致的问题，导致服务之间的连接失败。具体表现为：

1. 在Docker Compose配置中，RabbitMQ使用环境变量`RABBITMQ_DEFAULT_USER`和`RABBITMQ_DEFAULT_PASS`设置用户名和密码
2. 在服务代码中，使用环境变量`RABBITMQ_USER`和`RABBITMQ_PASS`连接RabbitMQ
3. 在某些服务中，默认密码设置为`'liqpro'`，而在其他服务中设置为`'liqpro_password'`

这种不一致导致服务无法正确连接到RabbitMQ，从而影响系统的正常运行。

## 解决方案

我们创建了一个修复脚本`fix-rabbitmq-auth.sh`，用于统一RabbitMQ的用户名和密码配置。该脚本执行以下操作：

1. 在所有环境配置文件(`.env`, `.env.dev`, `.env.prod`)中设置统一的用户名和密码：
   - `RABBITMQ_USER=liqpro`
   - `RABBITMQ_PASS=liqpro_password`

2. 修改服务代码中的默认值，确保与环境变量一致

3. 在Docker Compose配置中，使用环境变量设置RabbitMQ的用户名和密码：
   ```yaml
   environment:
     - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER:-liqpro}
     - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS:-liqpro_password}
   ```

## 使用方法

如果遇到RabbitMQ连接问题，可以按照以下步骤解决：

1. 确保所有服务都已停止：
   ```bash
   cd unified-config
   ./stop.sh
   # 如果服务没有完全停止，可以使用以下命令
   docker stop $(docker ps -q)
   ```

2. 运行修复脚本：
   ```bash
   cd unified-config
   ./fix-rabbitmq-auth.sh
   ```

3. 脚本会自动更新配置文件，清理RabbitMQ数据卷，并重新启动服务

## 注意事项

1. 修复脚本会清除RabbitMQ的数据卷，这意味着所有队列和消息都会被删除
2. 如果在生产环境中使用，请确保在执行脚本前备份重要数据
3. 如果修改了RabbitMQ的用户名或密码，请确保同时更新所有相关服务的配置

## 标准配置

为了避免未来出现类似问题，请遵循以下标准配置：

- RabbitMQ用户名：`liqpro`
- RabbitMQ密码：`liqpro_password`
- 环境变量名称：`RABBITMQ_USER`和`RABBITMQ_PASS`
- Docker环境变量映射：`RABBITMQ_DEFAULT_USER=${RABBITMQ_USER:-liqpro}`和`RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS:-liqpro_password}`

在添加新服务时，请确保遵循这些标准，以保持配置的一致性。 