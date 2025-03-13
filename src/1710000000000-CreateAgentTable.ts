import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAgentTable1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'config',
            type: 'jsonb',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['RUNNING', 'WAITING', 'STOPPED'],
            default: "'STOPPED'",
          },
          {
            name: 'total_value',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'available_balance',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'positions',
            type: 'jsonb',
            default: '[]',
          },
          {
            name: 'health_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        indices: [
          {
            name: 'idx_agents_user_id',
            columnNames: ['user_id'],
          },
          {
            name: 'idx_agents_status',
            columnNames: ['status'],
          },
          {
            name: 'idx_agents_health_score',
            columnNames: ['health_score'],
          },
        ],
      }),
      true
    );

    // 创建更新时间触发器
    await queryRunner.query(`
      CREATE TRIGGER update_agents_updated_at
        BEFORE UPDATE ON agents
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('agents');
  }
}
