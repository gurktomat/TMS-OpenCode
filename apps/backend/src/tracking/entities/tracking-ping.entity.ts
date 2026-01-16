import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';

export enum LocationMethod {
  DRIVER_APP = 'DRIVER_APP',
  ELD = 'ELD',
  GPS = 'GPS',
  MANUAL = 'MANUAL'
}

@Entity('tracking_pings')
@Index(['shipmentId'])
@Index(['driverId'])
@Index(['timestamp'])
@Index(['shipmentId', 'timestamp'])
export class TrackingPingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shipmentId: string;

  @Column()
  driverId: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column({ type: 'enum', enum: LocationMethod, default: LocationMethod.DRIVER_APP })
  locationMethod: LocationMethod;

  @Column({ type: 'jsonb', nullable: true })
  accuracy: any;

  @Column({ type: 'jsonb', nullable: true })
  additionalData: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ShipmentEntity, shipment => shipment.trackingPings)
  @JoinColumn({ name: 'shipmentId' })
  shipment: ShipmentEntity;

  @ManyToOne(() => DriverEntity, driver => driver.trackingPings)
  @JoinColumn({ name: 'driverId' })
  driver: DriverEntity;
}