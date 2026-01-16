import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LOAD = 'ON_LOAD',
  OFF_DUTY = 'OFF_DUTY',
  SICK = 'SICK',
  VACATION = 'VACATION'
}

export enum LicenseType {
  CLASS_A = 'CLASS_A',
  CLASS_B = 'CLASS_B',
  CLASS_C = 'CLASS_C'
}

@Entity('drivers')
@Index(['tenantId'])
@Index(['phoneNumber'])
@Index(['cdlNumber'])
@Index(['carrierId'])
export class DriverEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  carrierId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ unique: true })
  cdlNumber: string;

  @Column({ type: 'enum', enum: LicenseType, default: LicenseType.CLASS_A })
  licenseType: LicenseType;

  @Column({ type: 'date', nullable: true })
  licenseExpirationDate: Date;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.ACTIVE })
  status: DriverStatus;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ type: 'date', nullable: true })
  hireDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  experienceYears: number;

  @Column({ type: 'jsonb', nullable: true })
  endorsements: string[];

  @Column({ type: 'jsonb', nullable: true })
  equipmentExperience: string[];

  @Column({ type: 'jsonb', nullable: true })
  medicalCertificate: any;

  @Column({ type: 'jsonb', nullable: true })
  drivingRecord: any;

  @Column({ type: 'jsonb', nullable: true })
  emergencyContact: any;

  @Column({ type: 'jsonb', nullable: true })
  preferences: any;

  @Column({ type: 'jsonb', nullable: true })
  complianceInfo: any;

  @Column({ type: 'timestamp', nullable: true })
  lastDispatchDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLocationUpdate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalMiles: number;

  @Column({ type: 'int', default: 0 })
  completedLoads: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  onTimePercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  safetyScore: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CarrierEntity, { nullable: true })
  @JoinColumn({ name: 'carrierId' })
  carrier: CarrierEntity;

  @OneToMany(() => DispatchAssignmentEntity, assignment => assignment.driver)
  assignments: DispatchAssignmentEntity[];
}