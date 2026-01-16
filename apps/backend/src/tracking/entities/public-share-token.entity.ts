import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';

export enum TokenType {
  READ = 'READ',
  WRITE = 'WRITE'
}

@Entity('public_share_tokens')
@Index(['token'])
@Index(['shipmentId'])
@Index(['expiresAt'])
@Index(['shipmentId', 'token'])
export class PublicShareTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  shipmentId: string;

  @Column({ type: 'enum', enum: TokenType, default: TokenType.READ })
  tokenType: TokenType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'int', default: 1 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastViewedAt: Date;

  @Column({ type: 'text', nullable: true })
  lastViewedIp: string;

  @Column({ type: 'text', nullable: true })
  lastViewedUserAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  accessLog: any[];

  @Column({ type: 'jsonb', nullable: true })
  restrictions: any;

  @Column({ type: 'text', nullable: true })
  purpose: string;

  @Column({ type: 'text', nullable: true })
  createdFor: string;

  @Column({ nullable: true })
  createdById: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ShipmentEntity, shipment => shipment.shareTokens)
  @JoinColumn({ name: 'shipmentId' })
  shipment: ShipmentEntity;
}