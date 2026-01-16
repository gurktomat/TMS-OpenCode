import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CarrierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED'
}

export enum SafetyRating {
  SATISFACTORY = 'SATISFACTORY',
  CONDITIONAL = 'CONDITIONAL',
  UNSATISFACTORY = 'UNSATISFACTORY',
  NOT_RATED = 'NOT_RATED'
}

@Entity('carriers')
@Index(['tenantId'])
@Index(['scac'])
@Index(['mcNumber'])
export class CarrierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true, length: 4 })
  scac: string;

  @Column({ unique: true, nullable: true })
  mcNumber: string;

  @Column({ nullable: true })
  dotNumber: string;

  @Column({ type: 'enum', enum: SafetyRating, default: SafetyRating.NOT_RATED })
  safetyRating: SafetyRating;

  @Column({ type: 'enum', enum: CarrierStatus, default: CarrierStatus.PENDING })
  status: CarrierStatus;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cargoCoverage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  liabilityCoverage: number;

  @Column({ type: 'jsonb', nullable: true })
  equipmentTypes: string[];

  @Column({ type: 'jsonb', nullable: true })
  serviceAreas: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  totalShipments: number;

  @Column({ type: 'int', default: 0 })
  successfulShipments: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  onTimePercentage: number;

  @Column({ type: 'date', nullable: true })
  insuranceExpirationDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  contactInfo: any;

  @Column({ type: 'jsonb', nullable: true })
  operatingAuthority: any;

  @Column({ type: 'jsonb', nullable: true })
  paymentTerms: any;

  @Column({ type: 'jsonb', nullable: true })
  specialRequirements: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => CarrierLaneEntity, lane => lane.carrier)
  lanes: CarrierLaneEntity[];

  @OneToMany(() => LoadTenderEntity, tender => tender.carrier)
  tenders: LoadTenderEntity[];
}