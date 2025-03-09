import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id' })
  agentId: string;

  @Column({ name: 'pool_address' })
  poolAddress: string;

  @Column('decimal', { precision: 18, scale: 6 })
  amount: number;

  @Column('decimal', { name: 'price_impact', precision: 18, scale: 6 })
  priceImpact: number;

  @Column()
  type: string;

  @Column('jsonb')
  metadata: Record<string, any>;

  @Column()
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 