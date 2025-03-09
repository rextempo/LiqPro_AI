import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  name: string;

  @Column('jsonb')
  config: Record<string, any>;

  @Column()
  status: string;

  @Column('decimal', { name: 'total_value', precision: 18, scale: 6 })
  totalValue: number;

  @Column('decimal', { name: 'available_balance', precision: 18, scale: 6 })
  availableBalance: number;

  @Column('jsonb')
  positions: Record<string, any>[];

  @Column('decimal', { name: 'health_score', precision: 5, scale: 2 })
  healthScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 