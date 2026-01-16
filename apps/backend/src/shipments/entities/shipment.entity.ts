import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ShipmentStatus {
  QUOTE = 'QUOTE',
  TENDERED = 'TENDERED', 
  BOOKED = 'BOOKED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum EquipmentType {
  DRY_VAN = 'DRY_VAN',
  REEFER = 'REEFER',
  FLATBED = 'FLATBED',
  STEP_DECK = 'STEP_DECK',
  LOW_BOY = 'LOW_BOY',
  TANKER = 'TANKER',
  CONTAINER = 'CONTAINER',
  POWER_ONLY = 'POWER_ONLY'
}

export enum ShipmentPriority {
  STANDARD = 'STANDARD',
  EXPEDITED = 'EXPEDITED',
  URGENT = 'URGENT'
}

@Entity('shipments')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdAt'])
@Index(['referenceNumber'])
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNumber: string;

  @Column({ nullable: true })
  bolNumber: string;

  @Column({ nullable: true })
  purchaseOrderNumber: string;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.QUOTE })
  status: ShipmentStatus;

  @Column({ type: 'enum', enum: ShipmentPriority, default: ShipmentPriority.STANDARD })
  priority: ShipmentPriority;

  // Multi-tenancy
  @Column()
  @Index()
  tenantId: string;

  // Customer who owns the shipment
  @Column()
  customerId: string;

  // Carrier assigned to shipment (nullable)
  @Column({ nullable: true })
  carrierId: string;

  // Locations
  @Column()
  shipperLocationId: string;

  @Column()
  consigneeLocationId: string;

  // Timing
  @Column({ type: 'timestamp', nullable: true })
  pickupWindowStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickupWindowEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveryWindowStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveryWindowEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualPickupDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualDeliveryDate: Date;

  // Cargo Details
  @Column({ type: 'enum', enum: EquipmentType })
  equipmentType: EquipmentType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalWeight: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalVolume: number;

  @Column({ type: 'int', nullable: true })
  totalPieces: number;

  @Column({ type: 'text', nullable: true })
  commodityDescription: string;

  @Column({ type: 'jsonb', nullable: true })
  specialInstructions: any;

  @Column({ default: false })
  hazardousMaterial: boolean;

  @Column({ type: 'jsonb', nullable: true })
  temperatureRequirements: any;

  // Financial Information
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quotedRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fuelSurcharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  accessorialCharges: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  // Tracking and Visibility
  @Column({ type: 'text', nullable: true })
  trackingNumber: string;

  @Column({ type: 'jsonb', nullable: true })
  trackingEvents: any[];

  // Assignment
  @Column({ nullable: true })
  assignedDispatcherId: string;

  @Column({ nullable: true })
  assignedDriverId: string;

  // Additional Information
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ default: true })
  isActive: boolean;

  // Audit fields
  @Column()
  createdById: string;

  @Column({ nullable: true })
  updatedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => LocationEntity, { eager: true })
  @JoinColumn({ name: 'shipperLocationId' })
  shipperLocation: LocationEntity;

  @ManyToOne(() => LocationEntity, { eager: true })
  @JoinColumn({ name: 'consigneeLocationId' })
  consigneeLocation: LocationEntity;

  @ManyToOne(() => CompanyEntity, { eager: true })
  @JoinColumn({ name: 'customerId' })
  customer: CompanyEntity;

  @ManyToOne(() => CompanyEntity, { nullable: true })
  @JoinColumn({ name: 'carrierId' })
  carrier: CompanyEntity;

  @ManyToOne(() => UserEntity, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: UserEntity;
}