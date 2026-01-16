import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { DriverEntity } from './driver.entity';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';

export enum DispatchStatus {
  DISPATCHED = 'DISPATCHED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum DispatchType {
  PRIMARY = 'PRIMARY',
  BACKUP = 'BACKUP',
  EMERGENCY = 'EMERGENCY'
}

@Entity('dispatch_assignments')
@Index(['shipmentId'])
@Index(['driverId'])
@Index(['status'])
@Index(['tenantId'])
@Index(['shipmentId', 'driverId'])
export class DispatchAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  shipmentId: string;

  @Column()
  driverId: string;

  @Column({ type: 'enum', enum: DispatchStatus, default: DispatchStatus.DISPATCHED })
  status: DispatchStatus;

  @Column({ type: 'enum', enum: DispatchType, default: DispatchType.PRIMARY })
  dispatchType: DispatchType;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  dispatchMessage: string;

  @Column({ type: 'text', nullable: true })
  confirmationMessage: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', nullable: true })
  dispatchDetails: any;

  @Column({ type: 'jsonb', nullable: true })
  responseDetails: any;

  @Column({ type: 'jsonb', nullable: true })
  trackingEvents: any[];

  @Column({ type: 'jsonb', nullable: true })
  complianceChecklist: any;

  @Column({ type: 'jsonb', nullable: true })
  communicationLog: any[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ShipmentEntity, shipment => shipment.dispatchAssignments)
  @JoinColumn({ name: 'shipmentId' })
  shipment: ShipmentEntity;

  @ManyToOne(() => DriverEntity, driver => driver.assignments)
  @JoinColumn({ name: 'driverId' })
  driver: DriverEntity;
}