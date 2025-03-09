import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateInitialTables1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 创建agents表
        await queryRunner.createTable(
            new Table({
                name: 'agents',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()'
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: false
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                        isNullable: false
                    },
                    {
                        name: 'config',
                        type: 'jsonb',
                        isNullable: false,
                        default: '{}'
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        default: "'WAITING'"
                    },
                    {
                        name: 'total_value',
                        type: 'decimal',
                        precision: 18,
                        scale: 6,
                        isNullable: false,
                        default: 0
                    },
                    {
                        name: 'available_balance',
                        type: 'decimal',
                        precision: 18,
                        scale: 6,
                        isNullable: false,
                        default: 0
                    },
                    {
                        name: 'positions',
                        type: 'jsonb',
                        isNullable: false,
                        default: '[]'
                    },
                    {
                        name: 'health_score',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: false,
                        default: 0
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp with time zone',
                        default: 'CURRENT_TIMESTAMP'
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp with time zone',
                        default: 'CURRENT_TIMESTAMP'
                    }
                ],
                indices: [
                    {
                        name: 'idx_agents_user_id',
                        columnNames: ['user_id']
                    },
                    {
                        name: 'idx_agents_status',
                        columnNames: ['status']
                    },
                    {
                        name: 'idx_agents_health_score',
                        columnNames: ['health_score']
                    }
                ]
            }),
            true
        );

        // 创建transactions表
        await queryRunner.createTable(
            new Table({
                name: 'transactions',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()'
                    },
                    {
                        name: 'agent_id',
                        type: 'uuid',
                        isNullable: false
                    },
                    {
                        name: 'pool_address',
                        type: 'varchar',
                        length: '44',
                        isNullable: false
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 18,
                        scale: 6,
                        isNullable: false
                    },
                    {
                        name: 'price_impact',
                        type: 'decimal',
                        precision: 18,
                        scale: 6,
                        isNullable: false,
                        default: 0
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: false,
                        default: '{}'
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                        default: "'PENDING'"
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp with time zone',
                        default: 'CURRENT_TIMESTAMP'
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp with time zone',
                        default: 'CURRENT_TIMESTAMP'
                    }
                ],
                indices: [
                    {
                        name: 'idx_transactions_agent_id',
                        columnNames: ['agent_id']
                    },
                    {
                        name: 'idx_transactions_pool_address',
                        columnNames: ['pool_address']
                    },
                    {
                        name: 'idx_transactions_created_at',
                        columnNames: ['created_at']
                    },
                    {
                        name: 'idx_transactions_status',
                        columnNames: ['status']
                    }
                ],
                foreignKeys: [
                    {
                        columnNames: ['agent_id'],
                        referencedTableName: 'agents',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE'
                    }
                ]
            }),
            true
        );

        // 创建更新时间触发器函数
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // 为agents表添加更新时间触发器
        await queryRunner.query(`
            CREATE TRIGGER update_agents_updated_at
                BEFORE UPDATE ON agents
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        // 为transactions表添加更新时间触发器
        await queryRunner.query(`
            CREATE TRIGGER update_transactions_updated_at
                BEFORE UPDATE ON transactions
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 删除触发器
        await queryRunner.query('DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;');
        await queryRunner.query('DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;');
        
        // 删除触发器函数
        await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column;');
        
        // 删除表
        await queryRunner.dropTable('transactions');
        await queryRunner.dropTable('agents');
    }
} 