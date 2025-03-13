import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartitionedTables1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建分区表函数
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION create_transaction_partition()
            RETURNS TRIGGER AS $$
            DECLARE
                partition_date TEXT;
                partition_name TEXT;
                start_date TIMESTAMP;
                end_date TIMESTAMP;
            BEGIN
                partition_date := TO_CHAR(NEW.created_at, 'YYYY_MM');
                partition_name := 'transactions_' || partition_date;
                start_date := DATE_TRUNC('month', NEW.created_at);
                end_date := start_date + INTERVAL '1 month';

                -- 检查分区是否存在，如果不存在则创建
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = partition_name
                ) THEN
                    EXECUTE format(
                        'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions
                        FOR VALUES FROM (%L) TO (%L)',
                        partition_name,
                        start_date,
                        end_date
                    );

                    -- 为新分区创建索引
                    EXECUTE format(
                        'CREATE INDEX %I ON %I (agent_id)',
                        'idx_' || partition_name || '_agent_id',
                        partition_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX %I ON %I (pool_address)',
                        'idx_' || partition_name || '_pool_address',
                        partition_name
                    );
                    
                    EXECUTE format(
                        'CREATE INDEX %I ON %I (created_at)',
                        'idx_' || partition_name || '_created_at',
                        partition_name
                    );
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 创建分区表
    await queryRunner.query(`
            -- 创建新的分区表
            CREATE TABLE IF NOT EXISTS transactions_new (
                LIKE transactions INCLUDING ALL
            ) PARTITION BY RANGE (created_at);

            -- 创建触发器
            CREATE TRIGGER transaction_partition_trigger
                BEFORE INSERT ON transactions_new
                FOR EACH ROW
                EXECUTE FUNCTION create_transaction_partition();

            -- 创建初始分区（当前月份）
            CREATE TABLE transactions_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}
                PARTITION OF transactions_new
                FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE))
                TO (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month');

            -- 迁移数据
            INSERT INTO transactions_new
            SELECT * FROM transactions;

            -- 重命名表
            ALTER TABLE transactions RENAME TO transactions_old;
            ALTER TABLE transactions_new RENAME TO transactions;
            DROP TABLE transactions_old;
        `);

    // 创建分区维护函数
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION maintain_transaction_partitions()
            RETURNS void AS $$
            DECLARE
                future_date DATE;
                partition_date TEXT;
                partition_name TEXT;
                start_date TIMESTAMP;
                end_date TIMESTAMP;
            BEGIN
                -- 创建未来3个月的分区
                FOR i IN 1..3 LOOP
                    future_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' month')::INTERVAL);
                    partition_date := TO_CHAR(future_date, 'YYYY_MM');
                    partition_name := 'transactions_' || partition_date;
                    start_date := future_date;
                    end_date := future_date + INTERVAL '1 month';

                    -- 创建分区
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relname = partition_name
                    ) THEN
                        EXECUTE format(
                            'CREATE TABLE IF NOT EXISTS %I PARTITION OF transactions
                            FOR VALUES FROM (%L) TO (%L)',
                            partition_name,
                            start_date,
                            end_date
                        );

                        -- 创建索引
                        EXECUTE format(
                            'CREATE INDEX %I ON %I (agent_id)',
                            'idx_' || partition_name || '_agent_id',
                            partition_name
                        );
                        
                        EXECUTE format(
                            'CREATE INDEX %I ON %I (pool_address)',
                            'idx_' || partition_name || '_pool_address',
                            partition_name
                        );
                        
                        EXECUTE format(
                            'CREATE INDEX %I ON %I (created_at)',
                            'idx_' || partition_name || '_created_at',
                            partition_name
                        );
                    END IF;
                END LOOP;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 创建定期维护作业
    await queryRunner.query(`
            SELECT cron.schedule('maintain_transaction_partitions_job',
                               '0 0 1 * *',  -- 每月1日凌晨执行
                               'SELECT maintain_transaction_partitions()');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除定期维护作业
    await queryRunner.query(`
            SELECT cron.unschedule('maintain_transaction_partitions_job');
        `);

    // 删除维护函数
    await queryRunner.query(`
            DROP FUNCTION IF EXISTS maintain_transaction_partitions();
        `);

    // 删除分区触发器和函数
    await queryRunner.query(`
            DROP TRIGGER IF EXISTS transaction_partition_trigger ON transactions;
            DROP FUNCTION IF EXISTS create_transaction_partition();
        `);

    // 创建临时表
    await queryRunner.query(`
            CREATE TABLE transactions_temp (LIKE transactions INCLUDING ALL);
            INSERT INTO transactions_temp SELECT * FROM transactions;
            DROP TABLE transactions;
            ALTER TABLE transactions_temp RENAME TO transactions;
        `);
  }
}
