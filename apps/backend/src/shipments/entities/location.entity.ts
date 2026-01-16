import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('locations')
@Index(['tenantId'])
@Index(['postalCode'])
@Index(['city', 'state'])
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  street1: string;

  @Column({ nullable: true })
  street2: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  postalCode: string;

  @Column({ default: 'US' })
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string;

  @Column({ type: 'jsonb', nullable: true })
  operatingHours: any;

  @Column({ type: 'jsonb', nullable: true })
  specialInstructions: any;

  @Column({ type: 'jsonb', nullable: true })
  equipmentRestrictions: any;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  locationType: string; // warehouse, customer, terminal, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}