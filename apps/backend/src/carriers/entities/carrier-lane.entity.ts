import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { CarrierEntity } from './carrier.entity';

@Entity('carrier_lanes')
@Index(['carrierId', 'originZone', 'destinationZone'])
@Index(['originZone', 'destinationZone'])
@Index(['carrierId'])
export class CarrierLaneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  carrierId: string;

  @Column({ length: 2 })
  originZone: string;

  @Column({ length: 2 })
  destinationZone: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  ratePerMile: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  flatRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCharge: number;

  @Column({ type: 'decimal', precision: 3, scale: 0, nullable: true })
  minimumMiles: number;

  @Column({ type: 'decimal', precision: 3, scale: 0, nullable: true })
  maximumMiles: number;

  @Column({ type: 'jsonb', nullable: true })
  equipmentTypes: string[];

  @Column({ type: 'jsonb', nullable: true })
  accessorialCharges: any;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  fuelSurchargePercentage: number;

  @Column({ type: 'int', nullable: true })
  transitDaysMin: number;

  @Column({ type: 'int', nullable: true })
  transitDaysMax: number;

  @Column({ type: 'date', nullable: true })
  effectiveStartDate: Date;

  @Column({ type: 'date', nullable: true })
  effectiveEndDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  restrictions: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CarrierEntity, { eager: true })
  @JoinColumn({ name: 'carrierId' })
  carrier: CarrierEntity;
}