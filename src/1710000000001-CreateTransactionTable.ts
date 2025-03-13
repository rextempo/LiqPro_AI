import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTransactionTable1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建交易类型枚举
    await queryRunner.query(`
      CREATE TYPE transaction_type AS ENUM (
        'DEPOSIT',
        'WITHDRAW',
        'SWAP',
        'ADD_LIQUIDITY',
        'REMOVE_LIQUIDITY'
      );
    `);

    // 创建交易状态枚举
    await queryRunner.query(`
      CREATE TYPE transaction_status AS ENUM (
        'PENDING',
        'CONFIRMED',
        'FAILED'
      );
    `);

    // 创建基础表
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'agent_id',
            type: 'uuid',
          },
          {
            name: 'pool_address',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'transaction_type',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'transaction_status',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'signature',
            type: 'varchar',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // 创建分区表
    await queryRunner.query(`
      CREATE TABLE transactions_y2024m01 PARTITION OF transactions
      FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

      CREATE TABLE transactions_y2024m02 PARTITION OF transactions
      FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

      CREATE TABLE transactions_y2024m03 PARTITION OF transactions
      FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
    `);

    // 创建索引
    await queryRunner.query(`
      CREATE INDEX idx_transactions_agent_timestamp ON transactions (agent_id, timestamp);
      CREATE INDEX idx_transactions_pool_timestamp ON transactions (pool_address, timestamp);
      CREATE INDEX idx_transactions_timestamp ON transactions (timestamp);
    `);

    // 创建自动创建分区的函数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_transactions_partition()
      RETURNS trigger AS
      $$
      DECLARE
        partition_date date;
        partition_name text;
        start_date text;
        end_date text;
      BEGIN
        partition_date := date_trunc('month', NEW.timestamp);
        partition_name := 'transactions_y' || to_char(partition_date, 'YYYY') || 'm' || to_char(partition_date, 'MM');
        start_date := to_char(partition_date, 'YYYY-MM-DD');
        end_date := to_char(partition_date + interval '1 month', 'YYYY-MM-DD');
        
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
          EXECUTE format('CREATE TABLE %I PARTITION OF transactions FOR VALUES FROM (%L) TO (%L)', 
            partition_name, start_date, end_date);
          
          EXECUTE format('CREATE INDEX %I ON %I (agent_id, timestamp)',
            'idx_' || partition_name || '_agent_timestamp', partition_name);
          
          EXECUTE format('CREATE INDEX %I ON %I (pool_address, timestamp)',
            'idx_' || partition_name || '_pool_timestamp', partition_name);
        END IF;
        RETURN NEW;
      END;
      $$
      LANGUAGE plpgsql;
    `);

    // 创建触发器
    await queryRunner.query(`
      CREATE TRIGGER transactions_insert_trigger
      BEFORE INSERT ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION create_transactions_partition();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS transactions_insert_trigger ON transactions');
    await queryRunner.query('DROP FUNCTION IF EXISTS create_transactions_partition()');
    await queryRunner.dropTable('transactions', true, true);
    await queryRunner.query('DROP TYPE IF EXISTS transaction_type');
    await queryRunner.query('DROP TYPE IF EXISTS transaction_status');
  }
}
