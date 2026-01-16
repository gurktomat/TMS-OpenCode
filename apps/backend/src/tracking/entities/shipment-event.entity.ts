import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';

export enum EventType {
  ARRIVED_PICKUP = 'ARRIVED_PICKUP',
  LOADED = 'LOADED',
  DEPARTED_PICKUP = 'DEPARTED_PICKUP',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED_DELIVERY = 'ARRIVED_DELIVERY',
  UNLOADED = 'UNLOADED',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  DELAYED = 'DELAYED'
}

export enum EventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

@Entity('shipment_events')
@Index(['shipmentId'])
@Index(['eventType'])
@Index(['occurredAt'])
@Index(['shipmentId', 'occurredAt'])
export class ShipmentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shipmentId: string;

  @Column({ type: 'enum', enum: EventType })
  eventType: EventType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  city: string;

  @Column({ type: 'text', nullable: true })
  state: string;

  @Column({ type: 'text', nullable: true })
  postalCode: string;

  @Column({ type: 'text', nullable: true })
  country: string;

  @Column({ type: 'text', nullable: true })
  contactName: string;

  @Column({ type: 'text', nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  contactEmail: string;

  @Column({ type: 'jsonb', nullable: true })
  photos: any[];

  @Column({ type: 'jsonb', nullable: true })
  signatures: any;

  @Column({ type: 'jsonb', nullable: true })
  documents: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  driverId: string;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ShipmentEntity, shipment => shipment.events)
  @JoinColumn({ name: 'shipmentId' })
  shipment: ShipmentEntity;

  @ManyToOne(() => DriverEntity, driver => driver.events)
  @JoinColumn({ name: 'driverId' })
  driver: DriverEntity;
}