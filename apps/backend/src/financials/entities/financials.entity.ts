import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';
import { CompanyEntity } from '../../users/entities/user.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  RECEIVED = 'RECEIVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export enum LineItemType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  ADJUSTMENT = 'ADJUSTMENT'
}

@Entity('invoices')
@Index(['tenantId'])
@Index(['customerId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['invoiceNumber'])
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column()
  tenantId: string;

  @Column()
  customerId: string;

  @Column({ type: 'date' })
  invoiceDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balanceDue: number;

  @Column({ type: 'text', nullable: true })
  currency: string;

  @Column({ type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CompanyEntity, customer => customer.invoices)
  @JoinColumn({ name: 'customerId' })
  customer: CompanyEntity;

  @ManyToOne(() => ShipmentEntity, shipment => shipment.invoices)
  @JoinColumn({ name: 'shipmentId' })
  shipment: ShipmentEntity;

  @ManyToOne(() => CompanyEntity, createdBy => createdBy.invoices)
  @JoinColumn({ name: 'createdById' })
  createdBy: CompanyEntity;
}

@Entity('bills')
@Index(['tenantId'])
@Index(['loadTenderId'])
@Index(['carrierId'])
@Index(['status'])
@Index(['billNumber'])
export class BillEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  billNumber: string;

  @Column()
  tenantId: string;

  @Column()
  loadTenderId: string;

  @Column()
  carrierId: string;

  @Column({ type: 'date' })
  billDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'enum', enum: BillStatus, default: BillStatus.DRAFT })
  status: BillStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  agreedAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balanceDue: number;

  @Column({ type: 'text', nullable: true })
  currency: string;

  @Column({ type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => LoadTenderEntity, loadTender => loadTender.bills)
  @JoinColumn({ name: 'loadTenderId' })
  loadTender: LoadTenderEntity;

  @ManyToOne(() => CompanyEntity, carrier => carrier.bills)
  @JoinColumn({ name: 'carrierId' })
  carrier: CompanyEntity;

  @ManyToOne(() => CompanyEntity, createdBy => createdBy.bills)
  @JoinColumn({ name: 'createdById' })
  createdBy: CompanyEntity;
}

@Entity('financial_line_items')
@Index(['invoiceId'])
@Index(['billId'])
@Index(['type'])
export class FinancialLineItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  invoiceId: string;

  @Column({ nullable: true })
  billId: string;

  @Column({ type: 'enum', enum: LineItemType, default: LineItemType.REVENUE })
  type: LineItemType;

  @Column({ type: 'int' })
  lineNumber: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  unitOfMeasure: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'text', nullable: true })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  commodityCode: string;

  @Column({ type: 'text', nullable: true })
  locationId: string;

  @Column({ type: 'text', nullable: true })
  locationDescription: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => InvoiceEntity, invoice => invoice.lineItems)
  @JoinColumn({ name: 'invoiceId' })
  invoice: InvoiceEntity;

  @ManyToOne(() => BillEntity, bill => bill.lineItems)
  @JoinColumn({ name: 'billId' })
  bill: BillEntity;

  @ManyToOne(() => CompanyEntity, createdBy => createdBy.lineItems)
  @JoinColumn({ name: 'createdById' })
  createdBy: CompanyEntity;
}