import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';
import { CarrierEntity } from './carrier.entity';

export enum TenderStatus {
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum TenderType {
  PRIMARY = 'PRIMARY',
  BACKUP = 'BACKUP',
  SPOT = 'SPOT'
}

@Entity('load_tenders')
@Index(['shipmentId'])
@Index(['carrierId'])
@Index(['status'])
@Index(['shipmentId', 'carrierId'])
export class LoadTenderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shipmentId: string;

  @Column()
  carrierId: string;

  @Column({ type: 'enum', enum: TenderStatus, default: TenderStatus.OFFERED })
  status: TenderStatus;

  @Column({ type: 'enum', enum: TenderType, default: TenderType.PRIMARY })
  tenderType: TenderType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  offerAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  counterOfferAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  offerExpiryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  responseDate: Date;

  @Column({ type: 'text', nullable: true })
  responseNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  tenderDetails: any;

  @Column({ type: 'jsonb', nullable: true })
  carrierResponse: any;

  @Column({ type: 'timestamp', nullable: true })
  acceptedDate: Date;

  @Column({ nullable: true })
  acceptedById: string;

  @Column({ type: 'timestamp', nullable: true })
  rejectedDate: Date;

  @Column({ nullable: true })
  rejectedById: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelledDate: Date;

  @Column({ nullable: true })
  cancelledById: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'jsonb', nullable: true })
  auditTrail: any[];

  @Column({ type: 'jsonb', nullable: true })
  attachments: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ShipmentEntity, shipment => shipment.tenders)
  @JoinColumn({ name: 'shipmentId' })
  shipment: ShipmentEntity;

  @ManyToOne(() => CarrierEntity, carrier => carrier.tenders)
  @JoinColumn({ name: 'carrierId' })
  carrier: CarrierEntity;
}